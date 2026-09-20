"""A4 information card, composed from unmodified Penisuela source artwork.

Original portrait and icons remain unchanged. The campaign scene is placed
with reduced opacity; gradients and light effects are vector drawing only.
No backgrounds are removed and no canonical files are changed.
"""
from pathlib import Path
from card_print_utils import action_meta, output_paths
import json
import re
from xml.sax.saxutils import escape
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph

ROOT=Path(__file__).resolve().parents[2]
PDF,AUDIT_PATH=output_paths('bubsilda')
UI=ROOT/'assets/concepts/campaigns/penisuela/ui'
hero=next(x for x in json.loads((ROOT/'content/characters.json').read_text()) if x['id']=='bubsilda')
gameplay=json.loads((ROOT/'content/campaigns/penisuela-gallery-gameplay.json').read_text())
actions={x['sourceId']:x for x in gameplay['combatActions'] if x['characterId']=='bubsilda' and not x['id'].endswith('break-mirror-angle')}
abilities={x['id']:x for x in hero['abilities']}
items={x['id']:x for x in hero['items']}
css=(ROOT/'src/shared/styles/variables.css').read_text()
def color(name):
    return HexColor(re.search(r'--'+name+r':\s*(#[0-9a-fA-F]+);',css).group(1))
BG=color('color-night-deep'); PANEL=color('color-night'); PANEL2=color('color-night-soft')
GOLD=color('color-gold'); LIGHT=color('color-gold-light'); BORDER=color('color-gold-dark')
TEXT=color('color-parchment-light'); MUTED=color('color-brass-light')
for name,path in [('Body','/System/Library/Fonts/Supplemental/Arial.ttf'),('Body-Bold','/System/Library/Fonts/Supplemental/Arial Bold.ttf'),('Display','/System/Library/Fonts/Supplemental/Luminari.ttf')]:
    pdfmetrics.registerFont(TTFont(name,path))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='Body-Bold',italic='Body',boldItalic='Body-Bold')
W,H=A4
c=canvas.Canvas(str(PDF),pagesize=A4,pageCompression=1)
c.setTitle('Бубсильда · Информационная карточка')
c.setAuthor('Хроники Восьми Земель')
audit=[]; used_assets=set()

def rect(x,y,w,h,fill,stroke=None):
    c.setFillColor(fill);c.setStrokeColor(stroke or fill);c.setLineWidth(.45)
    c.rect(x,H-y-h,w,h,fill=1,stroke=bool(stroke))

def line(x,y,x2,y2,col=BORDER,width=.4):
    c.setStrokeColor(col);c.setLineWidth(width);c.line(x,H-y,x2,H-y2)

def text(t,x,y,size=10.5,font='Body',col=TEXT,center=False):
    c.setFont(font,size);c.setFillColor(col)
    if center:x-=pdfmetrics.stringWidth(t,font,size)/2
    c.drawString(x,H-y-size*.83,t)
    audit.append({'text':t,'x':x,'y':y,'w':pdfmetrics.stringWidth(t,font,size),'h':size,'size':size})

def para(t,x,y,w,size=10.5,leading=13.4,col=TEXT,font='Body'):
    p=Paragraph(t,ParagraphStyle('body',fontName=font,fontSize=size,leading=leading,textColor=col,splitLongWords=False))
    _,h=p.wrap(w,1000)
    p.drawOn(c,x,H-y-h)
    audit.append({'text':t,'x':x,'y':y,'w':w,'h':h,'size':size})
    return y+h

def art(path,x,y,w,h,box=None):
    path=Path(path)
    im=Image.open(path)
    if box:im=im.crop(box)
    # Preserve all artwork and alpha, only reduce excessive embedded resolution.
    im.thumbnail((max(1,round(w*450/72)),max(1,round(h*450/72))),Image.Resampling.LANCZOS)
    c.drawImage(ImageReader(im),x,H-y-h,width=w,height=h,mask='auto')
    used_assets.add(str(path.relative_to(ROOT)))

def framed_icon(path,x,y,size=43):
    # Match the campaign HUD: original artwork clipped by the round frame.
    c.saveState();clip=c.beginPath();clip.circle(x+size/2,H-y-size/2,size*.385);c.clipPath(clip,stroke=0)
    art(path,x+size*.1,y+size*.1,size*.8,size*.8)
    c.restoreState()
    art(UI/'floating-hud/action-orb-frame.png',x,y,size,size)

def glow(x,y,radius,col,strength=.1):
    # Smooth vector light: no processing of source artwork.
    c.saveState()
    c.setFillColor(col)
    for i in range(80,0,-1):
        c.setFillAlpha(strength/32)
        c.circle(x,H-y,radius*i/80,stroke=0,fill=1)
    c.restoreState()

# Open page, without any outer or header frame.
rect(0,0,W,H,PANEL)
glow(40,80,250,color('color-ice-shadow'),.1)
glow(W-15,740,150,color('color-ice-shadow'),.045)

# An existing campaign illustration creates a quiet tropical header.
# Uniform image opacity + an opaque-color overlay are layout effects;
# the complete original is preserved, with no background extraction.
scene=UI.parent/'scenes/private-villa-approach.png'
c.saveState()
clip=c.beginPath();clip.rect(0,H-190,W,190);c.clipPath(clip,stroke=0)
c.setFillAlpha(.22)
art(scene,0,-40,W,W*941/1672)
c.restoreState()
# Fade the scene into the plain information area, keeping the type clear.
for i in range(191):
    c.saveState()
    c.setFillColor(PANEL)
    c.setFillAlpha(.18+.82*(i/190)**1.7)
    c.rect(0,H-i-1.05,W,1.05,stroke=0,fill=1)
    c.restoreState()

glow(100,85,95,GOLD,.08)

# Source portrait: undistorted square in a simple rounded viewport.
px,py,ps=32,20,140
c.saveState();clip=c.beginPath();clip.roundRect(px,H-py-ps,ps,ps,12);c.clipPath(clip,stroke=0)
art(UI/'hero-tokens/bubsilda.png',px,py,ps,ps)
c.restoreState()
header_center=382
text('Карточка героя',header_center,22,10.3,'Display',LIGHT,True)
text(hero['name'],header_center,45,36,'Display',LIGHT,True)
text(hero['race'],header_center,91,12.3,'Display',TEXT,True)
text(hero['role'],header_center,112,9.2,'Body',TEXT,True)
core=[('ЗДОРОВЬЕ',str(hero['maxHp'])+' HP'),('ЗАЩИТА',str(hero['ac'])+' AC'),('АТАКА','1d20+6'),('ИНИЦИАТИВА','1d20+3')]
for i,(label,value) in enumerate(core):
    xc=header_center+(i-1.5)*86
    text(label,xc,134,7.2,'Body-Bold',MUTED,True)
    text(value,xc,146,13.3,'Body-Bold',TEXT,True)

# Six stat modifiers, with actual names and values from characters.json.
stats=[('strength','Сила'),('dexterity','Ловкость'),('constitution','Выносливость'),('wisdom','Мудрость'),('intelligence','Интеллект'),('charisma','Харизма')]
stat_y=179;sw=(W-60)/6
for i,(key,label) in enumerate(stats):
    x=30+i*sw
    if i:line(x,stat_y-3,x,stat_y+35)
    text(label,x+sw/2,stat_y,9,'Body',TEXT,True)
    text(f"{hero['stats'][key]:+d}",x+sw/2,stat_y+15,18,'Display',LIGHT,True)
line(30,220,W-30,220,GOLD,.65)

MARGIN=32;GUTTER=22
LEFT_WIDTH=279
RIGHT_WIDTH=W-2*MARGIN-GUTTER-LEFT_WIDTH
LX=MARGIN;RX=LX+LEFT_WIDTH+GUTTER
TEXT_INSET=45
text('Способности',LX+LEFT_WIDTH/2,232,17,'Display',LIGHT,True)
text('Инвентарь',RX+RIGHT_WIDTH/2,232,17,'Display',LIGHT,True)

# Presentation copy only. Effects follow the campaign rules chosen by the user.
# All stable ability/item IDs are checked against canonical character data.
skill_bodies={
  "northern-resilience": "Холодный урон вдвое. Первый контроль за бой отменяется и даёт <b>4 временных HP</b>.",
  "bubis-balance": "Нельзя сбить с ног или сдвинуть силой. Каждая такая попытка даёт <b>преимущество следующей атаке мечом</b>.",
  "royal-will": "Союзник снимает <b>один контроль</b>, ходит сразу после тебя и получает <b>преимущество первой атаке</b>.",
  "ice-guard": "<b>1d4 стражей на 3 раунда</b>. Каждый: <b>HP 10, AC 11, атака +4, урон 1d4+2</b>.",
  "documentary": "Раскрывает <b>следующее действие врага</b>. До твоего следующего хода первые попадания <b>двух разных героев</b> по нему: <b>+1d4 урона</b>.",
  "grandaxin": "<b>1d8</b>; всегда лечит <b>1d6 HP</b>. <b>1-2:</b> снимает 1 негативный эффект. <b>3-6:</b> снимает все негативные эффекты; <b>+2</b> к следующей атаке. <b>7-8:</b> как 3-6; ещё преимущество этой атаке и <b>6 временных HP</b>.",
  "emergency-landing": "Все враги <b>падают</b>. Ловкость <b>DC 12</b>: провал также отнимает следующее действие. Ты лежишь до начала своего следующего хода."
}
item_bodies={
 'boeing-sword':'<b>Атака +6, урон 1d8+3.</b> Постоянно экипированное оружие.',
 'comfort-cloak':'Холодный урон вдвое. С мастером: <b>+2 к Ловкости</b> на льду.',
 'ice-heart':'<b>+2 AC</b> до начала твоего следующего хода.',
 'yellow-snowball':'Снежная подмена открывает слабость врага и снижает его <b>AC</b> для следующего удара.',
 'vomit-bag':'С мастером: отменяет «Вечный Ледяной Рейс» АэроДракса; <b>+2 против магии холода</b>.'
}

def meta(a):
    return action_meta(a)

def block_height(content,w,size,leading,font='Body'):
    p=Paragraph(content,ParagraphStyle('measure',fontName=font,fontSize=size,leading=leading,splitLongWords=False))
    return p.wrap(w,1000)[1]

TITLE_SIZE=12.8; TITLE_LEADING=15.3
BODY_SIZE=10.5; BODY_LEADING=12.7

def entry_height(e,width):
    tw=width-TEXT_INSET
    return (block_height(escape(e['name']),tw,TITLE_SIZE,TITLE_LEADING,'Display')+2
            +block_height(e['detail'],tw,8.7,10.5)+3
            +block_height(e['body'],tw,BODY_SIZE,BODY_LEADING))

def entry(e,x,y,width):
    tx=x+TEXT_INSET;tw=width-TEXT_INSET
    if e['icon']:framed_icon(e['icon'],x-2,y-3,41)
    ty=para(escape(e['name']),tx,y,tw,size=TITLE_SIZE,leading=TITLE_LEADING,font='Display',col=LIGHT)+2
    ty=para(e['detail'],tx,ty,tw,size=8.7,leading=10.5,col=MUTED)+3
    return para(e['body'],tx,ty,tw,size=BODY_SIZE,leading=BODY_LEADING)

left_entries=[]
for a in hero['abilities']:
    detail=meta(actions[a['id']]) if a['uses'] else 'Пассивно · без расхода'
    if a['id']=='northern-resilience': detail='Пассивно · отмена контроля 1 / бой'
    left_entries.append({'id':a['id'],'name':a['name'],'detail':detail,'body':skill_bodies[a['id']],
                         'icon':UI/'skill-icons/bubsilda'/f"{a['id']}.png"})

right_entries=[]
aliases={'boeing-sword':'Меч «Боинг-Смерч»','comfort-cloak':'Пассажирский комфорт','ice-heart':'Кулон «Ледяное сердце»'}
for iid in ['boeing-sword','comfort-cloak','ice-heart','yellow-snowball','vomit-bag']:
    detail=meta(actions[iid]) if iid not in ['boeing-sword','comfort-cloak'] else ('Обычная атака · без расхода' if iid=='boeing-sword' else 'Плащ · пассивно · без расхода')
    right_entries.append({'id':iid,'name':aliases.get(iid,items[iid]['name']),'canonicalName':items[iid]['name'],
                          'detail':detail,'body':item_bodies[iid],'icon':UI/'item-icons/bubsilda'/f'{iid}.png'})

# Shared rows: both columns keep exact shared heading/separator baselines.
y=258
rows=[]
for index,left in enumerate(left_entries):
    right=right_entries[index] if index<len(right_entries) else None
    height=max(entry_height(left,LEFT_WIDTH),entry_height(right,RIGHT_WIDTH) if right else 0)+7
    end_left=entry(left,LX,y,LEFT_WIDTH)
    end_right=entry(right,RX,y,RIGHT_WIDTH) if right else None
    separator=y+height-3.5
    line(LX+TEXT_INSET,separator,LX+LEFT_WIDTH,separator)
    if right: line(RX+TEXT_INSET,separator,RX+RIGHT_WIDTH,separator)
    rows.append({'top':y,'height':height,'separator':separator,'left':left['id'],'right':right['id'] if right else None,
                 'textBottoms':[end_left,end_right]})
    y+=height

# The short inventory leaves room for the racial reference below it.
# Cold damage follows Penisuela's resistance, already described in the ability.
traits_y=rows[5]['top']
text('Наследие · с мастером',RX+RIGHT_WIDTH/2,traits_y,12.5,'Display',LIGHT,True)
traits_end=para('<b>Острое восприятие:</b> +2 к Мудрости, чтобы заметить, услышать или выследить.<br/><br/><b>Вахтёр Льда:</b> входящий физический урон меньше на 1.',
    RX+TEXT_INSET,traits_y+27,RIGHT_WIDTH-TEXT_INSET,size=10.5,leading=12.7)
assert traits_end<=y-3, ('traits overflow',traits_end,y)
assert y<=H-31, ('page overflow',y)
assert set(skill_bodies)==set(abilities)
assert set(item_bodies)==set(items)
c.showPage();c.save()
report={'card':'bubsilda','campaign':'penisuela','rules':'Penisuela, selected by user','pages':1,'bodyFont':BODY_SIZE,
        'columns':{'left':LX,'right':RX,'leftWidth':LEFT_WIDTH,'rightWidth':RIGHT_WIDTH,'gutter':GUTTER,'textInset':TEXT_INSET},
        'rows':rows,'contentEnd':y,'traitsEnd':traits_end,'assets':sorted(used_assets),'paragraphs':audit,
        'abilityIds':list(skill_bodies),'itemIds':list(item_bodies),'manualFields':False,'outerFrame':False,'headerFrame':False,
        'sourceFiles':['content/characters.json','content/campaigns/penisuela-gallery-gameplay.json','content/races.json','content/rules.json'],
        'canonicalDataChanged':False,'backgroundEffects':['campaign scene at reduced opacity','vector fade','subtle vector glows']}
AUDIT_PATH.write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'pdf':str(PDF),'rowsEnd':y,'traitsEnd':traits_end,'assets':len(used_assets)},ensure_ascii=False))
