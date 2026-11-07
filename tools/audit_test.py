import json, sys
from playwright.sync_api import sync_playwright
IMG='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k='
LONG='Supercalifragilisticexpialidocious_Frapp'
def data(theme,tax,many):
    cats=['Hot Coffee','Iced Coffee','Food','Seasonal Specials & Limited','Merchandise']
    n=40 if many else 6
    items=[dict(id=f'id{i}',name=(LONG if i%7==0 else ('Ham & Cheese Sandwich Deluxe' if i%3==0 else f'Item {i}')),price=(99999.99 if i==1 else 120+i),category=cats[i%5],icon='☕',image=IMG if i%4==0 else '') for i in range(n)]
    sales=[dict(id=k+1,date='2026-11-07T0%d:30:00.000Z'%(k%9),items=[dict(id='x',name=LONG,price=120,qty=3),dict(id='y',name='Latte',price=130,qty=2)],subtotal=620,tax=74.4,total=694.4,paid=1000,change=305.6) for k in range(12)]
    import datetime
    now=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).isoformat()+'Z'
    for s in sales: s['date']=now
    return dict(settings=dict(shopName='The Extremely Long Coffee Shop Name Here' if many else 'Quick Coffee',currency='USD$' if many else '₱',taxRate=tax,theme=theme,accent='#b9783f',logo=IMG if many else ''),categories=cats,items=items,sales=sales,orderCounter=13)
def cart(many):
    return [dict(id=f'id{i}',name=(LONG if i%7==0 else f'Item {i}'),price=(99999.99 if i==1 else 120+i),qty=(12 if i==1 else 2)) for i in range(0,8 if many else 3)]
CHECK="""()=>{const out=[];const W=innerWidth,H=innerHeight;
const vis=e=>{const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0)return false;const b=e.getBoundingClientRect();return b.width>0&&b.height>0};
const nm=e=>(e.tagName.toLowerCase()+'.'+String(e.className).split(' ').join('.')+'['+(e.textContent||'').trim().slice(0,14)+']');
const de=document.documentElement;
if(de.scrollWidth>W+1)out.push('PAGE h-overflow '+(de.scrollWidth-W));
if(Math.max(de.scrollHeight,document.body.scrollHeight)>H+1)out.push('PAGE v-overflow');
// 1 sibling overlap (in-flow siblings only)
document.querySelectorAll('body *').forEach(p=>{ if(!vis(p))return; const ps=getComputedStyle(p); if(/^(img|svg|input|select|textarea)$/i.test(p.tagName))return;
  const kids=[...p.children].filter(k=>vis(k)&&!/^(absolute|fixed|sticky)$/.test(getComputedStyle(k).position)&&!/(SCRIPT|STYLE)/.test(k.tagName));
  for(let i=0;i<kids.length;i++)for(let j=i+1;j<kids.length;j++){const a=kids[i].getBoundingClientRect(),b=kids[j].getBoundingClientRect();
   const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left),oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
   if(ox>2&&oy>2){ if(ps.display==='inline'||getComputedStyle(kids[i]).display.startsWith('inline')&&getComputedStyle(kids[j]).display.startsWith('inline'))continue; out.push('OVERLAP '+nm(kids[i])+' x '+nm(kids[j]))}}});
// 2 clipped content
document.querySelectorAll('body *').forEach(e=>{ if(!vis(e))return; const s=getComputedStyle(e);
  if(/^(hidden|clip)$/.test(s.overflowY)&&e.scrollHeight>e.clientHeight+2&&s.textOverflow!=='ellipsis'&&!/(HTML|BODY)/.test(e.tagName))out.push('CLIP-Y '+nm(e)+' '+e.scrollHeight+'>'+e.clientHeight);
  if(/^(hidden|clip)$/.test(s.overflowX)&&e.scrollWidth>e.clientWidth+2&&s.textOverflow!=='ellipsis')out.push('CLIP-X '+nm(e)+' '+e.scrollWidth+'>'+e.clientWidth);
  if(s.textOverflow==='ellipsis'&&e.scrollWidth>e.clientWidth+1&&!/shop|cartbar|btn|quick/.test(e.className)&&!e.matches('.quick *'))out.push('ELLIPSIS-HIDES '+nm(e));
  if(!/(HTML|BODY)/.test(e.tagName)&&!/(auto|scroll)/.test(s.overflowX)&&!/(hidden|clip)/.test(s.overflowX)&&e.children.length===0&&e.scrollWidth>e.clientWidth+2&&e.clientWidth>0)out.push('TEXT-OVERFLOW '+nm(e)+' '+e.scrollWidth+'>'+e.clientWidth);
});
// 3 interactive elements covered / outside viewport
const ROOT=document.querySelector('.overlay')||document.querySelector('.order.open')||document; ROOT.querySelectorAll('button,label.btn,select,input:not([type=file]):not([type=color])').forEach(e=>{ if(!vis(e))return; const b=e.getBoundingClientRect();
  if(e.closest('.tabs')&&!e.matches('.tab'))return;
  // skip things scrolled out of their own scroll container
  let a=e.parentElement,hiddenByScroll=false; while(a&&a!==document.body){const s=getComputedStyle(a); if(/(auto|scroll|hidden)/.test(s.overflowY+s.overflowX)){const ab=a.getBoundingClientRect(); if(b.bottom<ab.top+1||b.top>ab.bottom-1||b.right<ab.left+1||b.left>ab.right-1){hiddenByScroll=true;break}} a=a.parentElement}
  if(hiddenByScroll)return;
  if(b.right>W+1||b.left<-1||b.bottom>H+1||b.top<-1){ if(!e.closest('.tabs,.grid,.lines,.scroll'))out.push('OFFSCREEN '+nm(e)); return}
  // fully visible part? sample center of the visible intersection
  let cx=b.left+b.width/2,cy=b.top+b.height/2; let a2=e.parentElement; let L=b.left,R=b.right,T=b.top,B=b.bottom; while(a2&&a2!==document.body){const s=getComputedStyle(a2);if(/(auto|scroll|hidden)/.test(s.overflowY+s.overflowX)){const ab=a2.getBoundingClientRect();L=Math.max(L,ab.left);R=Math.min(R,ab.right);T=Math.max(T,ab.top);B=Math.min(B,ab.bottom)}a2=a2.parentElement}
  if(R-L<4||B-T<4)return; cx=(L+R)/2;cy=(T+B)/2; const t=document.elementFromPoint(cx,cy); if(t&&t!==e&&!e.contains(t)&&!t.contains(e))out.push('COVERED '+nm(e)+' by '+nm(t));
  // tap target size
  if((e.matches('button,label.btn')&&!e.closest('.chip')&&!e.matches('.sw,.link,.x'))&&(b.height<30||b.width<30))out.push('SMALL-TARGET '+nm(e)+' '+Math.round(b.width)+'x'+Math.round(b.height));
});
return [...new Set(out)]}"""
def run(views,tag):
    fails=[]
    with sync_playwright() as p:
        br=p.chromium.launch()
        for (w,h) in views:
          for theme in ['dark','light']:
            for mode in ['many','plain']:
                many=mode=='many'; tax=12 if many else 0
                touch=w<1100
                ctx=br.new_context(viewport={'width':w,'height':h},is_mobile=touch,has_touch=touch); pg=ctx.new_page(); pg.set_default_timeout(2500)
                errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
                pg.add_init_script("localStorage.setItem('quick_coffee_pos_v1',%s);localStorage.setItem('quick_coffee_cart_v1',%s)"%(json.dumps(json.dumps(data(theme,tax,many))),json.dumps(json.dumps(cart(many)))))
                T=f'{w}x{h}/{theme}/{mode}'
                def chk(st):
                    for x in pg.evaluate(CHECK): fails.append((T,st,x))
                try:
                    pg.goto('http://localhost:4173/'); pg.wait_for_selector('.card'); chk('main')
                    if pg.evaluate("document.querySelector('.app').classList.contains('sheet-mode')"):
                        pg.locator('.cartbar-info').click(); pg.wait_for_timeout(300); chk('sheet'); pg.locator('.order.open .sheet-close').click(); pg.wait_for_timeout(300)
                        pg.locator('.cartbar .btn.primary').click()
                    else: pg.locator('.order .pay').click()
                    pg.wait_for_selector('.pay-modal'); chk('pay-empty')
                    for k in '12.5': pg.keyboard.press(k)
                    chk('pay-short')
                    for k in range(5): pg.keyboard.press('Backspace')
                    for k in '999999999': pg.keyboard.press(k)
                    chk('pay-ok'); pg.locator('.pay-done').click(); pg.wait_for_selector('.change-banner'); chk('receipt')
                    pg.get_by_text('New Order').click()
                    if pg.evaluate("document.querySelector('.cartbar')"): pass
                    pg.get_by_role('button',name='Sales').click(); pg.wait_for_selector('.stats'); chk('sales'); pg.get_by_role('button',name='Close',exact=True).click()
                    pg.get_by_role('button',name='Settings').click(); pg.wait_for_selector('.modal.wide')
                    for t in ['Shop','Theme','Menu','Backup']:
                        pg.get_by_role('button',name=t,exact=True).click(); chk('set-'+t)
                        if t=='Menu':
                            pg.get_by_text('Edit',exact=True).first.click(); chk('set-Menu-edit')
                            pg.get_by_text('Add item').first.click() if False else None
                            pg.locator('.modal-foot.left .btn.primary').click(); pg.wait_for_timeout(100)
                            pg.locator('input[placeholder=Name]').fill(''); pg.locator('.modal-foot.left .btn.primary').click(); chk('set-Menu-err')
                    pg.get_by_role('button',name='Done').click()
                except Exception as ex: fails.append((T,'ABORT',str(ex).split(chr(10))[0][:110]))
                if errs: fails.append((T,'JS-ERR',errs[0][:100]))
                ctx.close()
        br.close()
    return fails
if __name__=='__main__':
    allv=[(280,653),(320,568),(360,300),(360,640),(390,844),(412,915),(430,932),(540,720),(599,800),(600,960),(699,900),(701,900),(768,1024),(820,1180),(900,500),(1000,700),(1001,700),(1280,800),(1366,768),(1920,1080),(2560,1440),(568,320),(640,360),(667,375),(844,390),(932,430)]
    i=int(sys.argv[1]); n=int(sys.argv[2]); f=run(allv[i::n],i)
    print('FAILS',len(f))
    for x in f: print(' -',*x)
