import json, os, tempfile
from playwright.sync_api import sync_playwright
R=[]
def ok(name,cond,info=''):
    R.append((name,bool(cond),info)); print(('PASS ' if cond else 'FAIL ')+name+(' -> '+str(info) if (not cond and info!='') else ''))
URL='http://localhost:4173/'
KEY='quick_coffee_pos_v1'
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('quick_coffee_pos_v1')||'null')")
def txt(pg,sel): return pg.locator(sel).first.inner_text()
with sync_playwright() as p:
    br=p.chromium.launch()
    def new(w=1280,h=800,init=None,**kw):
        ctx=br.new_context(viewport={'width':w,'height':h},accept_downloads=True,**kw); pg=ctx.new_page(); pg.set_default_timeout(4000)
        pg.errs=[]; pg.on('pageerror',lambda e:pg.errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
        if init: pg.add_init_script(init)
        pg.goto(URL); pg.wait_for_selector('.card'); return pg
    # ---------- cart + totals
    pg=new()
    pg.locator('.card',has=pg.get_by_text('Latte',exact=True)).click(); pg.locator('.card',has=pg.get_by_text('Latte',exact=True)).click(); pg.locator('.card',has=pg.get_by_text('Croissant',exact=True)).click()
    ok('cart total 325',txt(pg,'.row.big').endswith('₱325.00'),txt(pg,'.row.big'))
    pg.locator('.line').first.locator('.qty button').last.click()
    ok('plus increments',txt(pg,'.row.big').endswith('₱445.00'),txt(pg,'.row.big'))
    pg.locator('.line').first.locator('.qty button').first.click(); pg.locator('.line').first.locator('.qty button').first.click(); pg.locator('.line').first.locator('.qty button').first.click()
    ok('minus to zero removes line',pg.locator('.line').count()==1)
    pg.locator('.line .x').click(); ok('remove line',pg.locator('.line').count()==0 and 'Tap an item' in pg.inner_text('.lines'))
    ok('pay disabled when empty',pg.locator('.order .pay').is_disabled())
    pg.locator('.card',has=pg.get_by_text('Latte',exact=True)).click(); pg.reload(); pg.wait_for_selector('.card')
    ok('cart survives reload',pg.locator('.line').count()==1)
    pg.get_by_role('button',name='Clear').click(); ok('clear works',pg.locator('.line').count()==0)
    # ---------- tax math + rounding
    pg=new(init="if(!localStorage.getItem('%s'))localStorage.setItem('%s',JSON.stringify({settings:{taxRate:12,currency:'$',shopName:'T',theme:'light',accent:'#2fa36b'},categories:['A'],items:[{id:'i1',name:'Dime',price:0.1,category:'A'},{id:'i2',name:'Odd',price:19.99,category:'A'}]}))"%(KEY,KEY))
    pg.locator('.card',has=pg.get_by_text('Dime',exact=True)).click(); pg.locator('.card',has=pg.get_by_text('Dime',exact=True)).click(); pg.locator('.card',has=pg.get_by_text('Dime',exact=True)).click()
    ok('0.1*3 = 0.30 (no float drift)',pg.inner_text('.sum').count('$0.30')>=1,pg.inner_text('.sum'))
    pg.locator('.card',has=pg.get_by_text('Odd',exact=True)).click()
    sub=round(.3+19.99,2); tax=round(sub*.12,2)
    ok('tax 12% rounding',f'${tax:.2f}' in pg.inner_text('.sum') and f'${sub+tax:.2f}' in pg.inner_text('.sum'),pg.inner_text('.sum'))
    ok('light theme applied',pg.evaluate("document.documentElement.dataset.theme")=='light')
    ok('accent applied',pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()")=='#2fa36b')
    # pay: short blocked, exact ok, double-submit
    pg.locator('.order .pay').click()
    for k in '20': pg.keyboard.press(k)
    ok('short payment disabled',pg.locator('.pay-done').is_disabled())
    pg.get_by_role('button',name='Exact').click(); ok('exact enables',not pg.locator('.pay-done').is_disabled())
    pg.locator('.pay-done').dblclick(); pg.wait_for_selector('.change-banner')
    s=st(pg); ok('double-click creates ONE sale',len(s['sales'])==1,len(s['sales']))
    ok('sale math saved',abs(s['sales'][0]['total']-(sub+tax))<0.005 and s['sales'][0]['change']==0,s['sales'][0])
    ok('orderCounter increments',s['orderCounter']==2)
    pg.get_by_text('New Order').click(); ok('cart emptied after sale',pg.locator('.line').count()==0 and st(pg) is not None)
    # Enter key completes only once
    pg.locator('.card',has=pg.get_by_text('Odd',exact=True)).click(); pg.locator('.order .pay').click(); pg.get_by_role('button',name='Exact').focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(200); ok('Enter on focused Exact selects amount (not blocked)',pg.locator('.pay-modal').count()==1); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    ok('Enter completes exactly one sale',len(st(pg)['sales'])==2,len(st(pg)['sales']))
    pg.get_by_text('New Order').click()
    pg.keyboard.press('Escape')
    # Escape closes pay modal
    pg.locator('.card',has=pg.get_by_text('Odd',exact=True)).click(); pg.locator('.order .pay').click(); pg.keyboard.press('Escape'); ok('Escape closes payment',pg.locator('.pay-modal').count()==0)
    # sales history: yesterday excluded, today count
    pg.evaluate("""()=>{const s=JSON.parse(localStorage.getItem('quick_coffee_pos_v1'));const y=new Date(Date.now()-864e5).toISOString();s.sales.push({id:99,date:y,items:[],subtotal:5,tax:0,total:5,paid:5,change:0});localStorage.setItem('quick_coffee_pos_v1',JSON.stringify(s))}""")
    pg.reload(); pg.wait_for_selector('.card'); pg.get_by_role('button',name='Sales').click(); pg.wait_for_selector('.stats')
    ok("today's sales excludes yesterday",pg.locator('.hist').count()==2,pg.locator('.hist').count())
    ok('stats orders=2',pg.locator('.stats strong').nth(1).inner_text()=='2')
    pg.get_by_role('button',name='Clear history').click(); ok('clear history empties + resets counter',st(pg)['sales']==[] and st(pg)['orderCounter']==1,st(pg)['orderCounter'])
    ok('no page errors (cart/pay/sales)',not pg.errs,pg.errs)
    # ---------- settings editing
    pg=new()
    pg.get_by_role('button',name='Settings').click()
    pg.locator('input[placeholder="Coffee Shop"]').fill('Bean Co'); pg.locator('input[placeholder="₱"]').fill('$')
    pg.get_by_role('button',name='Shop',exact=True).click()
    ok('shop name + currency saved',st(pg)['settings']['shopName']=='Bean Co' and st(pg)['settings']['currency']=='$')
    tax=pg.locator('label.field:has-text("Tax") input'); tax.fill('12.5'); ok('tax decimal',st(pg)['settings']['taxRate']==12.5,st(pg)['settings']['taxRate'])
    tax.fill('abc'); ok('tax junk -> 0',st(pg)['settings']['taxRate']==0)
    tax.fill('250'); ok('tax clamped to 100',st(pg)['settings']['taxRate']==100,st(pg)['settings']['taxRate']); tax.fill('0')
    pg.get_by_role('button',name='Theme',exact=True).click(); pg.get_by_role('button',name='☀️ Light').click(); ok('theme switch',st(pg)['settings']['theme']=='light')
    pg.locator('.sw').nth(3).click(); ok('accent swatch',st(pg)['settings']['accent']=='#3b82f6')
    pg.get_by_role('button',name='Menu',exact=True).click()
    pg.locator('input[placeholder=Name]').fill('Test Brew'); pg.locator('input[placeholder=Price]').fill('55.5'); pg.locator('.modal-foot.left .btn.primary').click()
    ok('add item',any(i['name']=='Test Brew' and i['price']==55.5 for i in st(pg)['items']))
    pg.locator('.modal-foot.left .btn.primary').click(); ok('empty name error shown','name' in pg.inner_text('.err').lower())
    pg.locator('input[placeholder=Name]').fill('x'); pg.locator('.modal-foot.left .btn.primary').click(); ok('empty price error','price' in pg.inner_text('.err').lower())
    pg.locator('input[placeholder=Name]').fill(''); pg.locator('input[placeholder=Price]').fill('')
    row=pg.locator('.item-row',has_text='Test Brew'); row.get_by_text('Edit',exact=True).click(); pg.locator('input[placeholder=Price]').fill('60'); pg.get_by_text('Save changes').click()
    ok('edit item keeps id, updates price',[i for i in st(pg)['items'] if i['name']=='Test Brew'][0]['price']==60 and len([i for i in st(pg)['items'] if i['name']=='Test Brew'])==1)
    pg.locator('.item-row',has_text='Test Brew').get_by_text('Delete',exact=True).click(); ok('delete item',not any(i['name']=='Test Brew' for i in st(pg)['items']))
    pg.locator('input[placeholder="New category"]').fill('Zeta'); pg.get_by_text('Add',exact=True).first.click(); ok('add category','Zeta' in st(pg)['categories'])
    pg.locator('input[placeholder="New category"]').fill('zeta'); pg.get_by_text('Add',exact=True).first.click(); ok('duplicate category (case-insens.) not added',[c.lower() for c in st(pg)['categories']].count('zeta')==1,st(pg)['categories'])
    used=pg.locator('.chip',has_text='Hot Coffee').locator('button'); ok('used category cannot be deleted',used.is_disabled())
    pg.locator('.chip',has_text='Zeta').locator('button').click(); ok('unused category deleted','Zeta' not in st(pg)['categories'])
    # photo upload through real file input
    from PIL import Image; import io
    im=Image.new('RGB',(2000,1500),(180,120,60)); f=os.path.join(tempfile.gettempdir(),'big.jpg'); im.save(f,'JPEG')
    pg.locator('input[placeholder=Name]').fill('Photo Latte'); pg.locator('input[placeholder=Price]').fill('99'); pg.locator('.photo-row input[type=file]').set_input_files(f); pg.wait_for_selector('.photo-prev img')
    pg.locator('.modal-foot.left .btn.primary').click(); it=[i for i in st(pg)['items'] if i['name']=='Photo Latte'][0]
    ok('photo resized + stored as jpeg data url',it['image'].startswith('data:image/jpeg') and len(it['image'])<400000,len(it['image']))
    pg.locator('.modal-foot.left').locator('xpath=ancestor::div[contains(@class,"modal")]').get_by_role('button',name='Done').click()
    ok('photo card shown in menu',pg.locator('img.card-img').count()>=1)
    bad=os.path.join(tempfile.gettempdir(),'bad.txt'); open(bad,'w').write('hi')
    pg.get_by_role('button',name='Settings').click(); pg.get_by_role('button',name='Menu',exact=True).click(); pg.locator('.photo-row input[type=file]').set_input_files(bad); ok('non-image rejected with message',pg.locator('.err').count()>0,'')
    # ---------- backup / restore
    pg.get_by_role('button',name='Backup',exact=True).click()
    with pg.expect_download() as dl: pg.get_by_text('Export backup').click()
    path=dl.value.path(); data=json.load(open(path)); ok('backup file valid',data['app']=='quick-coffee-pos' and any(i['name']=='Photo Latte' for i in data['data']['items']))
    pg.get_by_role('button',name='Done').click()
    pg2=new(); pg2.get_by_role('button',name='Settings').click(); pg2.get_by_role('button',name='Backup',exact=True).click()
    pg2.locator('input[accept*=json]').set_input_files(path); pg2.wait_for_timeout(400)
    ok('restore on fresh device',any(i['name']=='Photo Latte' for i in st(pg2)['items']) and st(pg2)['settings']['shopName']=='Bean Co')
    junk=os.path.join(tempfile.gettempdir(),'junk.json'); open(junk,'w').write('{not json'); pg2.locator('input[accept*=json]').set_input_files(junk); pg2.wait_for_timeout(300); ok('corrupt backup rejected',pg2.locator('.err').count()==1)
    evil=os.path.join(tempfile.gettempdir(),'evil.json'); json.dump({'app':'quick-coffee-pos','data':{'settings':{'shopName':'<img src=x onerror=alert(1)>','accent':'red;}body{display:none','logo':'javascript:alert(1)'},'items':[{'name':'X','price':'abc'},{'name':'Ok','price':5,'image':'data:text/html;base64,AAAA'}],'categories':['A']}},open(evil,'w'))
    pg2.locator('input[accept*=json]').set_input_files(evil); pg2.wait_for_timeout(400); s=st(pg2)
    ok('hostile backup sanitized',s['settings']['accent']=='#b9783f' and s['settings']['logo']=='' and len(s['items'])==1 and s['items'][0]['image']=='' ,s['settings'])
    ok('no JS errors (settings/backup)',not pg.errs and not pg2.errs,(pg.errs,pg2.errs))
    # ---------- storage full warning
    pg=new(init="const _s=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.__full&&k==='quick_coffee_pos_v1')throw new DOMException('full','QuotaExceededError');return _s.call(this,k,v)}")
    pg.evaluate("window.__full=true"); pg.get_by_role('button',name='Settings').click(); pg.locator('input[placeholder="Coffee Shop"]').fill('Z'); ok('storage-full warning banner',pg.locator('.warn').count()==1)
    # ---------- corrupt storage / empty menu
    pg=new(init="localStorage.setItem('%s','{{{garbage')"%KEY); ok('garbage storage -> defaults',pg.locator('.card').count()==12)
    pg=new(init="localStorage.setItem('%s',JSON.stringify({categories:['A'],items:[],settings:{}}))"%KEY.replace("'","")) if False else None
    ctx=br.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page(); pg.add_init_script("localStorage.setItem('%s',JSON.stringify({categories:['A'],items:[{name:'',price:1}],settings:{}}))"%KEY); pg.goto(URL); pg.wait_for_selector('.empty'); ok('empty menu message',pg.locator('.empty').count()>=1)
    # ---------- rotation / resize while sheet open
    ctx=br.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True); pg=ctx.new_page(); pg.add_init_script("Object.defineProperty(screen,'orientation',{get(){return {type:innerWidth>innerHeight&&innerHeight<330?'landscape-primary':(window.__port===false?'landscape-primary':'portrait-primary')}}})"); pg.goto(URL); pg.wait_for_selector('.card')
    pg.locator('.card').first.click(); pg.locator('.cartbar-info').click(); pg.wait_for_timeout(300); pg.set_viewport_size({'width':844,'height':390}); pg.wait_for_timeout(300)
    ok('rotate with open sheet -> split, no backdrop',pg.locator('.backdrop').count()==0 and pg.locator('.order').is_visible())
    pg.set_viewport_size({'width':390,'height':844}); pg.wait_for_timeout(300); ok('rotate back -> cartbar',pg.locator('.cartbar').count()==1)
    # keyboard-open simulation on portrait phone must not flip to compact
    pg.set_viewport_size({'width':390,'height':330}); pg.wait_for_timeout(200); ok('portrait short (keyboard) stays non-compact',not pg.evaluate("document.querySelector('.app').classList.contains('compact')"))
    br.close()
bad=[r for r in R if not r[1]]; print('\nTOTAL',len(R),'FAILED',len(bad))
