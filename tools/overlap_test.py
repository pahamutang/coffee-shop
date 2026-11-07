import json
from playwright.sync_api import sync_playwright
d=dict(settings=dict(shopName='Q',currency='₱',taxRate=0,theme='dark',accent='#b9783f',logo=''),categories=['Hot'],items=[dict(id='a',name='Americano',price=90,category='Hot',icon='☕',image='')],sales=[],orderCounter=1)
cart=[dict(id='a',name='Americano',price=90,qty=1),dict(id='b',name='Supercalifragilistic Frappuccino Grande',price=1234.5,qty=12)]
JS="""()=>{const bad=[];document.querySelectorAll('.order .line').forEach((l,li)=>{const k=[...l.children].filter(e=>e.getBoundingClientRect().width);
 for(let i=0;i<k.length;i++)for(let j=i+1;j<k.length;j++){const a=k[i].getBoundingClientRect(),b=k[j].getBoundingClientRect();
  if(a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1)bad.push(li+':'+k[i].className+'x'+k[j].className)}});return bad}"""
with sync_playwright() as p:
    br=p.chromium.launch(); tot=0
    for w,h in [(320,568),(360,640),(401,800),(450,800),(540,720),(600,960),(699,900),(701,900),(800,600),(1000,700),(1001,700),(1100,800),(1280,800),(1500,900),(1920,1080),(2560,1440),(844,390),(932,430)]:
        pg=br.new_context(viewport={'width':w,'height':h}).new_page()
        pg.add_init_script("localStorage.setItem('quick_coffee_pos_v1',%s);localStorage.setItem('quick_coffee_cart_v1',%s)"%(json.dumps(json.dumps(d)),json.dumps(json.dumps(cart))))
        pg.goto('http://localhost:4173/'); pg.wait_for_selector('.card')
        if pg.evaluate("document.querySelector('.app').classList.contains('sheet-mode')"): pg.locator('.cartbar-info').click(); pg.wait_for_timeout(350)
        r=pg.evaluate(JS); tot+=len(r); print(w,h,'OVERLAP' if r else 'ok',r[:3])
        if w==1280: pg.screenshot(path='shots/ov-1280.png')
    br.close()
print('total overlaps',tot)
