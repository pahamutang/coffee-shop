import sys, json
from playwright.sync_api import sync_playwright
VIEWS=[(280,653),(320,480),(320,568),(360,300),(360,640),(375,667),(390,844),(412,915),(430,932),(540,720),(561,900),(599,800),(600,960),(699,900),(700,900),(759,1000),(768,1024),(800,600),(900,500),(1001,700),(1100,400),(1280,800),(1366,768),(1920,1080),(2560,1440),(3440,1440),(568,320),(640,360),(844,390),(932,430)]
IMG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAIAQMAAADOtka5AAAAA1BMVEW5eD+B1gSiAAAAC0lEQVQI12NgAAIAAAUAAeImBZsAAAAASUVORK5CYII='
long='Supercalifragilisticexpialidocious_Frappuccino_X'[:40]
def data(theme):
    cats=['Hot Coffee','Iced Coffee','Food','Seasonal Specials & Limited','Merchandise','Beans','Tea','Pastry','Smoothies','Other']
    items=[]
    for i in range(40):
        n = long if i%7==0 else ('Ham & Cheese Sandwich Deluxe Large' if i%3==0 else f'Item {i}')
        items.append(dict(id=f'id{i}',name=n,price=99999.99 if i==1 else 120+i,category=cats[i%len(cats)],icon='☕',image=IMG if i%5==0 else ''))
    return dict(settings=dict(shopName='The Extremely Long Coffee Shop Name Here',currency='USD$',taxRate=12,theme=theme,accent='#b9783f',logo=IMG),categories=cats,items=items,sales=[],orderCounter=1)
def cart():
    return [dict(id=f'id{i}',name=(long if i%7==0 else f'Item {i}'),price=(99999.99 if i==1 else 120+i),qty=(99 if i==1 else 2)) for i in range(0,9)]
fails=[]
with sync_playwright() as p:
    br=p.chromium.launch()
    for theme in ['dark','light']:
      for w,h in VIEWS:
        touch = w<1100
        ctx=br.new_context(viewport={'width':w,'height':h},device_scale_factor=1,is_mobile=touch,has_touch=touch)
        pg=ctx.new_page(); pg.set_default_timeout(3000); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.add_init_script("localStorage.setItem('quick_coffee_pos_v1',%s);localStorage.setItem('quick_coffee_cart_v1',%s)"%(json.dumps(json.dumps(data(theme))),json.dumps(json.dumps(cart()))))
        pg.goto(''+__import__('os').environ.get('URL','http://localhost:4173/')+''); pg.wait_for_selector('.card')
        tag=f'{w}x{h}/{theme}'
        def chk(stage):
            r=pg.evaluate("""()=>{const out=[];const W=innerWidth,H=innerHeight;
              const de=document.documentElement; if(de.scrollWidth>W+1) out.push('page h-overflow '+(de.scrollWidth-W));
              if(de.scrollHeight>H+1||document.body.scrollHeight>H+1) out.push('page v-overflow '+Math.max(de.scrollHeight,document.body.scrollHeight)+'>'+H);
              const vis=e=>{const s=getComputedStyle(e);const b=e.getBoundingClientRect();return s.visibility!=='hidden'&&s.display!=='none'&&b.width>0&&b.height>0};
              // visible interactive elements fully inside viewport horizontally and not clipped by ancestors
              document.querySelectorAll('button:not(.tab),input,select,label.btn,.line,.row,.badge,h1,h2,.stats div').forEach(e=>{ if(!vis(e))return; const b=e.getBoundingClientRect();
                 if(b.right>W+1||b.left<-1) out.push('offscreen-x '+(e.className||e.tagName)+' l='+Math.round(b.left)+' r='+Math.round(b.right));
                 // clipped by scroll ancestor horizontally
                 let a=e.parentElement; while(a&&a!==document.body){const s=getComputedStyle(a); if(/(hidden|auto|scroll|clip)/.test(s.overflowX)&&a.scrollWidth>a.clientWidth+1&&!/tabs/.test(a.className)){const ab=a.getBoundingClientRect(); if(b.right>ab.right+1||b.left<ab.left-1){out.push('clipped-by '+a.className+' elem='+(e.className||e.tagName));break;}} a=a.parentElement;}
              });
              // text overflow
              document.querySelectorAll('.card-name,.line-name,.card-price,.line-total,.row span,.cartbar-info,.top h1,.hist,.stats strong,.item-row,.btn').forEach(e=>{ if(!vis(e))return; if(e.scrollWidth>e.clientWidth+1){const s=getComputedStyle(e); if(s.textOverflow!=='ellipsis') out.push('text-overflow '+e.className+' "'+(e.textContent||'').slice(0,25)+'" '+e.scrollWidth+'>'+e.clientWidth);}});
              return [...new Set(out)].slice(0,8)}""")
            for x in r: fails.append((tag,stage,x))
        try:
            chk('main')
            sheet=pg.evaluate("document.querySelector('.app').classList.contains('sheet-mode')")
            if sheet:
                pg.locator('.cartbar-info').click(); pg.wait_for_timeout(300); chk('sheet')
                b=pg.locator('.order.open .pay').bounding_box()
                if not b or b['y']+b['height']>h+1: fails.append((tag,'sheet','pay not in view'))
                pg.locator('.order.open .sheet-close').click(); pg.wait_for_timeout(300)
                pg.locator('.cartbar .btn.primary').click(timeout=3000)
            else:
                b=pg.locator('.order .pay').bounding_box()
                if not b or b['y']+b['height']>h+1 or b['y']<0: fails.append((tag,'split','pay not in view'))
                pg.locator('.order .pay').click()
            pg.wait_for_selector('.pay-modal'); chk('pay')
            pg.screenshot(path=f'shots/s-{w}x{h}-{theme}-pay.png') if theme=='dark' and (w,h) in [(320,480),(360,300),(900,500)] else None
            for k in '999999999': pg.keyboard.press(k)
            if pg.locator('.pay-done').is_disabled(): fails.append((tag,'pay','complete disabled'))
            bb=pg.locator('.pay-done').bounding_box()
            if not bb or bb['y']+bb['height']>h+1: fails.append((tag,'pay','complete out of view'))
            pg.locator('.pay-done').click(); pg.wait_for_selector('.change-banner'); chk('receipt')
            bb=pg.locator('.modal-foot .btn.primary').bounding_box()
            if bb['y']+bb['height']>h+1: fails.append((tag,'receipt','New Order out of view'))
            pg.get_by_text('New Order').click()
            pg.get_by_role('button',name='Sales').click(); pg.wait_for_selector('.stats'); chk('sales')
            pg.get_by_role('button',name='Close',exact=True).click()
            pg.get_by_role('button',name='Settings').click(); pg.wait_for_selector('.modal.wide')
            for t in ['Shop','Theme','Menu','Backup']:
                pg.get_by_role('button',name=t,exact=True).click(); chk('settings-'+t)
            if errs: fails.append((tag,'errors',errs[:2]))
        except Exception as ex:
            fails.append((tag,'ABORT',str(ex).split(chr(10))[0][:120]))
        ctx.close()
    br.close()
print('FAILS',len(fails))
import collections
seen=set()
for f in fails:
    k=(f[1],f[2][:40])
    print(' -',*f)
