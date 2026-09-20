"""Build compact, playable GM cues; preserve the approved cover page."""
import argparse
import json
import re
from pathlib import Path
from tempfile import TemporaryDirectory
from xml.sax.saxutils import escape
from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
INK=HexColor('#191919'); MUTED=HexColor('#494949'); RULE=HexColor('#b7b0a7'); PALE=HexColor('#f1eee9')
W,H=landscape(A4); M=36; U=W-2*M

def register_fonts(font_dir):
    files={'Cue':'Arial.ttf','CueBold':'Arial Bold.ttf'}
    if not (font_dir/files['Cue']).exists():
        files={'Cue':'LiberationSans-Regular.ttf','CueBold':'LiberationSans-Bold.ttf'}
    for name,filename in files.items(): pdfmetrics.registerFont(TTFont(name,str(font_dir/filename)))
    pdfmetrics.registerFontFamily('Cue',normal='Cue',bold='CueBold')

def sty(name,size=12,leading=15.2,bold=False,color=INK):
    return ParagraphStyle(name,fontName='CueBold' if bold else 'Cue',fontSize=size,leading=leading,textColor=color)

BODY=sty('body'); QUOTE=sty('quote',13,16.2); HEAD=sty('head',11.5,14.4,True)
NOTE=sty('note',10.6,13.2,color=MUTED); PLAY=sty('play',11.6,14.8); SMALL=sty('small',9,11.6,color=MUTED)
SPOKEN=sty('spoken',12.5,15.8)

def para(c,text,x,y,w,style):
    p=Paragraph(escape(text).replace('\n','<br/>'),style)
    _,h=p.wrap(w,10000)
    p.drawOn(c,x,y-h)
    return y-h

def line(c,x,y,w):
    c.setStrokeColor(RULE);c.setLineWidth(.45);c.line(x,y,x+w,y)

def flatten_strings(value):
    if isinstance(value,str):
        yield value
    elif isinstance(value,list):
        for child in value:
            yield from flatten_strings(child)

def strings(p):
    for k,v in p.items():
        if k in ['id','sceneIds','kind','refs']: continue
        yield from flatten_strings(v)

def validate_source(d):
    assert d['version']==3 and d['campaignId']=='penisuela'
    pages=d['pages']; assert len({p['id'] for p in pages})==len(pages)
    g=json.loads((ROOT/'content/campaigns/penisuela-gallery-gameplay.json').read_text())
    v=json.loads((ROOT/'content/campaigns/penisuela-session-preview.json').read_text())
    valid={s['id'] for s in v['scenes']}; truth=g['storyTruth']
    required=set(truth['currentRouteSceneIds']+truth['optionalSceneIds']+truth['badEndingSceneIds'])
    covered={s for p in pages for s in p['sceneIds']}
    assert covered<=valid and required<=covered,(covered-valid,required-covered)
    for p in pages:
        assert re.fullmatch('[a-z0-9]+(?:-[a-z0-9]+)*',p['id'])
        assert not re.search(r'\bPussy\b(?! Sultan)', ' '.join(strings(p)))
        if p.get('kind')=='evidence': assert len(p['cards'])==12
        elif p.get('kind')=='dialogue':
            assert len(p['dialogueColumns'])==2
            assert all(2<=len(col)<=4 for col in p['dialogueColumns'])
            assert all(len(block)==2 for col in p['dialogueColumns'] for block in col)
        else:
            assert len(p['facts'])==3
            assert 3<=len(p['branches'])<=5
            assert all(len(row)==3 for row in p['branches'])
    return pages

def draw_page(c,p,num):
    c.setFillColor(MUTED);c.setFont('CueBold',8.5)
    label='СЦЕНА: '+p['scene'].upper()
    assert pdfmetrics.stringWidth(label,'CueBold',8.5)<U-65
    c.drawString(M,H-31,label);c.drawRightString(W-M,H-31,f'{num:02d}')
    c.setFillColor(INK);c.setFont('CueBold',25)
    assert pdfmetrics.stringWidth(p['title'],'CueBold',25)<U
    c.drawString(M,H-66,p['title'])
    y=para(c,p['play'],M,H-79,U,PLAY)-13
    if p.get('kind')=='dialogue':
        cw=(U-30)/2
        bottoms=[]
        for col,blocks in enumerate(p['dialogueColumns']):
            x=M+col*(cw+30);yy=y
            for head,text in blocks:
                yy=para(c,head,x,yy,cw,HEAD)-5
                yy=para(c,text,x,yy,cw,SPOKEN)-12
            bottoms.append(yy)
        content_bottom=min(bottoms)
    elif p.get('kind')=='evidence':
        cw=(U-28)/2
        bottoms=[]
        for col in range(2):
            yy=y;x=M+col*(cw+28)
            for card in p['cards'][col*6:(col+1)*6]:
                yy=para(c,card[0],x,yy,cw,HEAD)-3
                yy=para(c,card[1],x,yy,cw,NOTE)-3
                yy=para(c,card[2],x,yy,cw,BODY)-12
            bottoms.append(yy)
        content_bottom=min(bottoms)
    else:
        pp=Paragraph(escape(p['hook']),QUOTE);_,hh=pp.wrap(U-22,1000)
        c.setFillColor(PALE);c.roundRect(M,y-hh-20,U,hh+20,4,stroke=0,fill=1)
        pp.drawOn(c,M+11,y-hh-10)
        y-=hh+38
        lw=235; gap=25; rx=M+lw+gap; rw=U-lw-gap
        ly=y
        c.setFillColor(MUTED);c.setFont('CueBold',8.5);c.drawString(M,ly,'ЧТО МОГУТ СПРОСИТЬ');ly-=13
        for head,text in p['facts']:
            ly=para(c,head,M,ly,lw,HEAD)-3
            ly=para(c,text,M,ly,lw,BODY)-12
        line(c,M,ly+3,lw)
        ly=para(c,'ЕСЛИ ЗАСТРЯЛИ',M,ly-8,lw,SMALL)-5
        ly=para(c,p['nudge'],M,ly,lw,BODY)
        ry=y
        for trigger,quote,move in p['branches']:
            ry=para(c,trigger,rx,ry,rw,HEAD)-4
            ry=para(c,quote,rx,ry,rw,QUOTE)-3
            ry=para(c,move,rx,ry,rw,NOTE)-10
        content_bottom=min(ly,ry)
    # Footer is placed after measured content, leaving a guaranteed gutter.
    refs=p.get('refs',[])
    ref_height=12*len(refs)
    exit_par=Paragraph(escape(p['exit']),SMALL);_,eh=exit_par.wrap(U,1000)
    footer_top=27+ref_height+eh+9
    assert content_bottom>=footer_top+12,f"{p['id']}: bottom {content_bottom:.1f}, footer {footer_top:.1f}; shorten by {footer_top+12-content_bottom:.1f}pt"
    line(c,M,footer_top,U)
    exit_par.drawOn(c,M,footer_top-7-eh)
    ry=footer_top-7-eh-12
    for title,url in refs:
        c.setFont('Cue',8);c.setFillColor(MUTED)
        text='Отсылка: '+title
        c.drawString(M,ry,text)
        c.linkURL(url,(M,ry-2,M+pdfmetrics.stringWidth(text,'Cue',8),ry+9),relative=0)
        ry-=12
    c.showPage()
    return dict(id=p['id'],contentBottomPt=round(content_bottom,2),footerTopPt=round(footer_top,2))

def normalize(t): return re.sub(r'\s|[«»„“”".]','',t).casefold()

def export_spoken_dialogues(pages):
    lines=['# Готовые разговоры']
    for p in pages:
        if p.get('kind')!='dialogue': continue
        lines += ['## '+p['title'],'**Сцена:** '+p['scene'],p['play']]
        for column in p['dialogueColumns']:
            for heading,body in column:
                lines += ['### '+heading,body]
        lines += [p['exit']]
    (HERE/'spoken-dialogues.md').write_text('\n\n'.join(lines)+'\n')

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--font-dir',type=Path,default=Path('/System/Library/Fonts/Supplemental'))
    ap.add_argument('--output',type=Path,default=HERE/'penisuela-gm-handbook.pdf')
    ap.add_argument('--qa-json',type=Path)
    args=ap.parse_args();register_fonts(args.font_dir)
    pages=validate_source(json.loads((HERE/'scene-cues.json').read_text()))
    with TemporaryDirectory(prefix='penisuela-gm-') as temp:
        path=Path(temp)/'body.pdf';c=canvas.Canvas(str(path),pagesize=(W,H),pageCompression=1)
        metrics=[draw_page(c,p,i) for i,p in enumerate(pages,1)];c.save()
        body=PdfReader(path);assert len(body.pages)==len(pages)
        for p,page in zip(pages,body.pages):
            got=normalize(page.extract_text())
            for text in strings(p):
                assert normalize(text) in got,(p['id'],text)
        cover=PdfReader(HERE/'penisuela-gm-cover.pdf');assert len(cover.pages)==1
        writer=PdfWriter();writer.add_page(cover.pages[0]);writer.add_outline_item('Пенисуэла',0)
        for i,page in enumerate(body.pages,1):
            writer.add_page(page);writer.add_outline_item(f'{i:02d}. {pages[i-1]["title"]}',i)
        writer.add_metadata({'/Title':'Пенисуэла - подсказки для живой игры','/Author':'','/Subject':'Сцены, поведение, реплики и ответы на ходы игроков'})
        with args.output.open('wb') as f:writer.write(f)
    result=PdfReader(args.output)
    assert len(result.pages)==len(pages)+1
    assert len(result.outline)==len(result.pages)
    assert result.pages[0].get_contents().get_data()==cover.pages[0].get_contents().get_data()
    for page in result.pages:
        assert abs(float(page.mediabox.width)-W)<1 and abs(float(page.mediabox.height)-H)<1
    export_spoken_dialogues(pages)
    if args.qa_json:args.qa_json.write_text(json.dumps({'pages':len(result.pages),'sheets':metrics},ensure_ascii=False,indent=2)+'\n')
    print(f'Created {args.output}: approved cover + {len(pages)} sheets; coverage, text, links and margins checked.')

if __name__=='__main__':main()
