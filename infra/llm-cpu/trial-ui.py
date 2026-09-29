#!/usr/bin/env python3
"""Public trial chat for the remote text-only llama.cpp model."""

import json
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


HTML = Path(__file__).with_name("trial-ui.html").read_bytes()

MODES = {
    "free": {
        "label": "Свободный чат",
        "description": "Вопросы, объяснения и любые текстовые задачи.",
        "example": "Объясни новичку, как устроена проверка d20, за три предложения.",
        "system": "Ты полезный собеседник. Отвечай по-русски ясно и по существу. Если данных не хватает, скажи об этом.",
    },
    "gm": {
        "label": "Мастер",
        "description": "Сцены, последствия решений и живой ход приключения.",
        "example": "Пятеро героев входят в заброшенную башню. Начни сцену и спроси, что они делают.",
        "system": "Ты мастер настольной фэнтезийной игры. Веди короткие атмосферные сцены, реагируй на действия игроков и в конце спрашивай, что они делают дальше. Не выдумывай канон кампании, если он не предоставлен. Не меняй реальные данные игры: это пробный чат.",
    },
    "npc": {
        "label": "Персонаж",
        "description": "Диалог от лица NPC с заданным характером и целью.",
        "example": "Ты трактирщица, которая знает тайну подвала, но боится говорить. Я спрашиваю: что здесь случилось?",
        "system": "Отыгрывай заданного пользователем NPC от первого лица. Сохраняй характер, мотив и знание персонажа, отвечай естественными короткими репликами. Если NPC не задан, попроси его описать.",
    },
    "combat": {
        "label": "Враги",
        "description": "Тактика врагов по описанному состоянию боя.",
        "example": "Два гоблина у двери, шаман за ними. Герои: воин у двери, маг ранен. Что делают враги в этот ход и почему?",
        "system": "Ты управляешь врагами в настольной фэнтезийной игре. По предоставленной обстановке предложи разумное действие каждого врага, цель и краткую реплику. Не придумывай точные правила, броски или изменение HP без данных пользователя. Если важной информации нет, явно назови допущение.",
    },
    "world": {
        "label": "Идеи мира",
        "description": "Локации, зацепки, загадки и варианты развития сюжета.",
        "example": "Придумай три необычные зацепки для приключения на летающем острове.",
        "system": "Ты помогаешь придумывать фэнтезийный мир и приключения. Предлагай конкретные, разные и пригодные для игры идеи на русском языке. Отделяй свои новые предложения от фактов, сообщённых пользователем.",
    },
    "analysis": {
        "label": "Разбор текста",
        "description": "Краткое резюме, противоречия и вопросы к сценарию.",
        "example": "Разбери задумку: стража никого не пускает в замок, но герои свободно входят через главные ворота. Что здесь не сходится?",
        "system": "Ты редактор сценария настольной игры. Анализируй только данный пользователем текст: кратко выдели суть, возможные противоречия и вопросы, которые помогут его улучшить. Не выдавай домыслы за факты.",
    },
}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/":
            self.reply(200, HTML, "text/html; charset=utf-8")
        elif self.path == "/modes":
            public = [{"id": mode_id, **{key: mode[key] for key in ("label", "description", "example")}}
                      for mode_id, mode in MODES.items()]
            self.reply(200, json.dumps(public, ensure_ascii=False).encode(), "application/json; charset=utf-8")
        elif self.path == "/health":
            try:
                urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=2).close()
                ready = True
            except (urllib.error.URLError, TimeoutError):
                ready = False
            self.reply(200, json.dumps({"ready": ready}).encode(), "application/json")
        else:
            self.reply(404, b"Not found", "text/plain")

    def do_POST(self):
        if self.path != "/chat":
            self.reply(404, b"Not found", "text/plain")
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 120_000:
                raise ValueError("Слишком длинный запрос")
            raw = json.loads(self.rfile.read(size))
            if not isinstance(raw, dict):
                raise ValueError("Некорректный запрос")
            mode = MODES.get(raw.get("mode"))
            if mode is None:
                raise ValueError("Неизвестный режим")
            messages = raw["messages"]
            if not isinstance(messages, list) or not 1 <= len(messages) <= 30:
                raise ValueError("Некорректная история диалога")
            clean = []
            for message in messages:
                if not isinstance(message, dict) or message.get("role") not in ("user", "assistant") or not isinstance(message.get("content"), str):
                    raise ValueError("Некорректная реплика")
                if len(message["content"]) > 4000:
                    raise ValueError("Слишком длинная реплика")
                clean.append({"role": message["role"], "content": message["content"]})
            request = {
                "model": "qwen3.5-9b",
                "messages": [{"role": "system", "content": mode["system"]}, *clean],
                "max_tokens": 700,
                "temperature": 0.7,
                "stream": True,
                "chat_template_kwargs": {"enable_thinking": False},
            }
            upstream = urllib.request.Request(
                "http://127.0.0.1:8000/v1/chat/completions",
                data=json.dumps(request, ensure_ascii=False).encode(),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(upstream, timeout=600) as response:
                self.begin_stream()
                try:
                    for raw_line in response:
                        line = raw_line.decode("utf-8").strip()
                        if not line.startswith("data: "):
                            continue
                        payload = line[6:]
                        if payload == "[DONE]":
                            break
                        choices = json.loads(payload).get("choices") or []
                        delta = (choices[0].get("delta") or {}).get("content") if choices else None
                        if isinstance(delta, str) and delta:
                            self.stream_event({"delta": delta})
                    self.stream_event({"done": True})
                except (BrokenPipeError, ConnectionResetError):
                    return
                except (ValueError, KeyError, TypeError, UnicodeDecodeError, urllib.error.URLError, TimeoutError) as error:
                    self.stream_event({"error": f"Поток ответа прерван: {error}"})
        except (ValueError, KeyError, TypeError) as error:
            self.reply(400, json.dumps({"error": str(error)}, ensure_ascii=False).encode(), "application/json; charset=utf-8")
        except (urllib.error.URLError, TimeoutError) as error:
            self.reply(503, json.dumps({"error": f"Модель недоступна: {error}"}, ensure_ascii=False).encode(), "application/json; charset=utf-8")

    def begin_stream(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/x-ndjson; charset=utf-8")
        self.send_header("Cache-Control", "no-store, no-transform")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Accel-Buffering", "no")
        self.send_header("Connection", "close")
        self.end_headers()
        self.close_connection = True

    def stream_event(self, data):
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode() + b"\n")
        self.wfile.flush()

    def reply(self, status, body, content_type):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    host = os.getenv("DND_TRIAL_HOST", "0.0.0.0")
    port = int(os.getenv("DND_TRIAL_PORT", "8080"))
    ThreadingHTTPServer((host, port), Handler).serve_forever()
