"""A4 information card, composed from unmodified Penisuela source artwork.

Only scaling, layout clipping and frame slicing are used. No backgrounds are
removed and no original files or canonical game data are changed.
"""
from pathlib import Path
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
DEST=Path(__file__).resolve().parent
PDF=DEST/'linda-penisuela-a4-v3.pdf'
UI=ROOT/'assets/concepts/campaigns/penisuela/ui'
hero=next(x for x in json.loads((ROOT/'content/characters.json').read_text()) if x['id']=='linda')
gameplay=json.loads((ROOT/'content/campaigns/penisuela-gallery-gameplay.json').read_text())
actions={x['sourceId']:x for x in gameplay['combatActions'] if x['characterId']=='linda' and x['id']!='linda-break-mirror-angle'}
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
c.setTitle('Линда · Пенисуэла · Информационная карточка')
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

def frame(x,y,w,h):
    # Nine-slice the original campaign frame: corners retain their proportions.
    path=UI/'quest-shell-frame.png'; im=Image.open(path)
    xs=[0,175,1497,1672];ys=[0,165,776,941]
    dx=[x,x+27,x+w-27,x+w];dy=[y,y+27,y+h-27,y+h]
    for i in range(3):
        for j in range(3):
            if i==1 and j==1:continue
            piece=im.crop((xs[i],ys[j],xs[i+1],ys[j+1]))
            c.drawImage(ImageReader(piece),dx[i],H-dy[j+1],dx[i+1]-dx[i],dy[j+1]-dy[j],mask='auto')
    used_assets.add(str(path.relative_to(ROOT)))

rect(0,0,W,H,BG)
rect(19,26,W-38,H-52,PANEL)
frame(11,16,W-22,H-32)

# The original dialogue frame provides the campaign's portrait/title treatment.
hx,hy,hw,hh=19,24,W-38,(W-38)/3
cx=hx+303/2172*hw;cy=hy+337/724*hh
diam=115
c.saveState();clip=c.beginPath();clip.circle(cx,H-cy,diam/2);c.clipPath(clip,stroke=0)
art(UI/'hero-tokens/linda.png',cx-diam/2,cy-diam/2,diam,diam)
c.restoreState()
art(UI/'dialogue-panel-frame.png',hx,hy,hw,hh)
header_center=hx+1220/2172*hw
text('Карточка героя',header_center,hy+92/724*hh,10.3,'Display',LIGHT,True)
text(hero['name'],header_center,67,31,'Display',LIGHT,True)
text(hero['race'],header_center,107,12,'Display',TEXT,True)
text('Разведчица · Поддержка · Контроль',header_center,124,9.2,'Body',TEXT,True)
core=[('ЗДОРОВЬЕ',str(hero['maxHp'])+' HP'),('ЗАЩИТА',str(hero['ac'])+' AC'),('АТАКА','1d20+6'),('ИНИЦИАТИВА','1d20+4')]
for i,(label,value) in enumerate(core):
    xc=header_center+(i-1.5)*88
    text(label,xc,137,7.2,'Body-Bold',MUTED,True)
    text(value,xc,149,13.3,'Body-Bold',TEXT,True)

# Six stat modifiers, with actual names and values from characters.json.
stats=[('strength','Сила'),('dexterity','Ловкость'),('constitution','Выносливость'),('wisdom','Мудрость'),('intelligence','Интеллект'),('charisma','Харизма')]
stat_y=201;sw=(W-60)/6
for i,(key,label) in enumerate(stats):
    x=30+i*sw
    if i:line(x,stat_y-3,x,stat_y+35)
    text(label,x+sw/2,stat_y,9,'Body',TEXT,True)
    text(f"{hero['stats'][key]:+d}",x+sw/2,stat_y+15,18,'Display',LIGHT,True)
line(30,245,W-30,245,GOLD,.65)

MARGIN=32;GUTTER=26
COL=(W-2*MARGIN-GUTTER)/2
LX=MARGIN;RX=LX+COL+GUTTER
TEXT_INSET=51
text('Способности',LX+COL/2,259,17,'Display',LIGHT,True)
text('Инвентарь',RX+COL/2,259,17,'Display',LIGHT,True)

skill_icons={'will-to-live':'will-to-live','flight':'flight','tiny-size':'size-change','magic-whisper':'magic-whisper','pitahaya-summon':'pitahayanoid-summon','resort-turbulence':'resort-turbulence'}
summ=next(e for e in actions['pitahaya-summon']['effects'] if e['type']=='summon-allies')
unit=summ['unit'];atk=unit['attack']
skill_bodies={
 'will-to-live':'Сопротивление ядам. Раз за бой смертельный урон оставляет <b>1 HP</b> и снимает негативные боевые эффекты.',
 'flight':'Наземные враги атакуют с помехой. Следующая атака: <b>+1d6 урона</b>, затем полёт завершается.',
 'tiny-size':'В малом облике: <b>+3 AC, -2 к атакам</b>; не провоцируешь реакции. Обычный рост даёт преимущество следующей атаке.',
 'magic-whisper':'Выбери врага. Первые попадания <b>двух разных героев</b> по нему наносят по <b>+1d4 урона</b>.',
 'pitahaya-summon':f"<b>{summ['countDice']} существ на {summ['durationRounds']} раунда</b>; ходят после тебя. Каждый: <b>HP {unit['hp']}, AC {unit['ac']}, атака +{atk['bonus']}, урон {atk['damage']}</b>. Попадание: Выносливость <b>DC {atk['onHitSavingThrow']['dc']}</b>; провал - помеха следующей атаке.",
 'resort-turbulence':'Первые <b>две успешные атаки врагов</b> по команде перебрасываются; берётся худший результат.'
}
def meta(a):
    activ={'action':'Действие','passive':'Пассивно','movement':'Перемещение','bonus':'Бонусное действие','attack':'Вместо атаки'}
    scope={'campaign':'кампанию','battle':'бой','turn':'ход','location':'локацию','round':'раунд'}
    return activ.get(a.get('activation'),'Действие')+' · '+str(a['uses']['max'])+' / '+scope[a['uses']['scope']]

def block_height(content,w,size,leading,font='Body'):
    p=Paragraph(content,ParagraphStyle('measure',fontName=font,fontSize=size,leading=leading,splitLongWords=False))
    return p.wrap(w,1000)[1]

def entry_height(e):
    tw=COL-TEXT_INSET
    return (block_height(escape(e['name']),tw,12.8,15.3,'Display')+2
            +block_height(e['detail'],tw,8.7,10.5)+3
            +block_height(e['body'],tw,10.5,13.1))

def entry(e,x,y):
    tx=x+TEXT_INSET;tw=COL-TEXT_INSET
    if e['icon']:framed_icon(e['icon'],x-2,y-3,47)
    ty=para(escape(e['name']),tx,y,tw,size=12.8,leading=15.3,font='Display',col=LIGHT)+2
    ty=para(e['detail'],tx,ty,tw,size=8.7,leading=10.5,col=MUTED)+3
    return para(e['body'],tx,ty,tw,size=10.5,leading=13.1)

left_entries=[]
for a in hero['abilities']:
    detail=meta(actions[a['id']])
    if a['id']=='will-to-live':detail='Пассивно · спасение 1 / бой'
    left_entries.append({'id':a['id'],'name':a['name'],'detail':detail,'body':skill_bodies[a['id']],
                         'icon':UI/'skill-icons/linda'/f"{skill_icons[a['id']]}.png"})

# All six items share the same text gutter, including those without source icons.
right_entries=[]
consumables=[
 ('healing-pollen','healing-pollen','Восстанавливает <b>2d8 HP</b> одному союзнику.'),
 ('blinding-pollen','blinding-pollen','<b>Атака +4, урон 1d8.</b> Попадание: Выносливость <b>DC 12</b> или ослепление с помехой следующей атаке.'),
 ('pitahaya','pitahaya-reserve','Восстанавливает тебе <b>10 HP</b>.')
]
for id,icon,body in consumables:
    right_entries.append({'id':id,'name':items[id]['name'],'detail':meta(actions[id]),'body':body,
                          'icon':UI/'item-icons/linda'/f'{icon}.png'})
gear=[
 ('fairy-claws','Обычная атака · без расхода','<b>Атака +6, урон 1d6+4.</b> Если <b>AC цели ≥15</b>, считай её AC на <b>2 ниже</b> для этой атаки.'),
 ('nose-ring-lockpick','Пассивно · без расхода','<b>Преимущество на Ловкость</b> для замков, механизмов и простых ловушек. Можно пробовать необычные маленькие механизмы.'),
 ('glitter','3 / кампанию','На себя или союзника: <b>+3 к Харизме</b> на одну социальную сцену.')
]
for id,detail,body in gear:
    right_entries.append({'id':id,'name':items[id]['name'],'detail':detail,'body':body,'icon':None})

# A single measured row grid governs both columns. Short entries never move
# the next row upwards; every pair has the same heading and separator baseline.
y=285
rows=[]
for left,right in zip(left_entries,right_entries,strict=True):
    height=max(entry_height(left),entry_height(right))+9
    end_left=entry(left,LX,y);end_right=entry(right,RX,y)
    separator=y+height-4.5
    line(LX+TEXT_INSET,separator,LX+COL,separator)
    line(RX+TEXT_INSET,separator,RX+COL,separator)
    rows.append({'top':y,'height':height,'separator':separator,'left':left['id'],'right':right['id'],
                 'textBottoms':[end_left,end_right]})
    y+=height
footer_y=y+7
footer_end=para('<b>Фейская природа:</b> преимущество против ядов и газов; полёт без тяжёлой брони.',
                LX,footer_y,W-2*MARGIN,size=9.3,leading=11.5,col=TEXT)
assert footer_end<H-31, f'Overflow: rows end {y}, footer ends {footer_end}'
c.showPage();c.save()
report={'card':'linda','campaign':'penisuela','rules':'Penisuela, selected by user','pages':1,'bodyFont':10.5,
        'columns':{'left':LX,'right':RX,'width':COL,'gutter':GUTTER,'textInset':TEXT_INSET},
        'rows':rows,'footerTop':footer_y,'footerEnd':footer_end,'assets':sorted(used_assets),'paragraphs':audit,'manualFields':False}
(DEST/'linda-penisuela-a4-v3.sources.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'pdf':str(PDF),'rowsEnd':y,'footerEnd':footer_end,'assets':len(used_assets)},ensure_ascii=False))
