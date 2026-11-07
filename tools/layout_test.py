import sys, json, os
SHOTS = os.environ.get('SHOTS', 'shots'); os.makedirs(SHOTS, exist_ok=True)
URL = os.environ.get('URL', 'http://localhost:4173/')
from playwright.sync_api import sync_playwright

VIEWS = [
 ("phone-320x568",320,568,True),("phone-360x640",360,640,True),("phone-390x844",390,844,True),("phone-412x915",412,915,True),("phone-430x932",430,932,True),
 ("land-568x320",568,320,True),("land-640x360",640,360,True),("land-667x375",667,375,True),("land-844x390",844,390,True),("land-915x412",915,412,True),("land-932x430",932,430,True),
 ("tab-600x960",600,960,True),("tab-768x1024",768,1024,True),("tab-820x1180",820,1180,True),("tab-1024x768",1024,768,True),("tab-1180x820",1180,820,True),("tab-1280x800",1280,800,True),
 ("lap-1366x768",1366,768,False),("lap-1440x900",1440,900,False),("fhd-1920x1080",1920,1080,False),("qhd-2560x1440",2560,1440,False),
]
SHOT = set(sys.argv[1:])
fails = []

def inside(page, box, name, vp):
    if not box: fails.append((vp,name,'not found/visible')); return False
    W,H = page.evaluate("[innerWidth, innerHeight]")
    ok = box['x']>=-1 and box['y']>=-1 and box['x']+box['width']<=W+1 and box['y']+box['height']<=H+1
    if not ok: fails.append((vp,name,f"out of viewport box={ {k:round(v) for k,v in box.items()} } vp={W}x{H}"))
    return ok


def line_clip(page, name, tag):
    bad = page.evaluate("""(()=>{const o=document.querySelector('.order'); if(!o) return 'no order';
      const r=o.getBoundingClientRect(); const out=[];
      o.querySelectorAll('.line > *').forEach(e=>{const b=e.getBoundingClientRect(); if(b.width&&(b.right>r.right+1||b.left<r.left-1)) out.push(e.className+':'+Math.round(b.right-r.right)); });
      return out.join(',');})()""")
    if bad: fails.append((name,tag,'order row clipped: '+bad))

def vis_box(page, sel, nth=0):
    loc = page.locator(sel)
    if loc.count()==0: return None
    l = loc.nth(nth)
    return l.bounding_box() if l.is_visible() else None

with sync_playwright() as p:
    br = p.chromium.launch()
    for name,w,h,touch in VIEWS:
        ctx = br.new_context(viewport={'width':w,'height':h}, device_scale_factor=2 if touch else 1, is_mobile=touch, has_touch=touch)
        page = ctx.new_page()
        errs=[]; page.on('pageerror', lambda e: errs.append(str(e))); page.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        page.goto(URL); page.wait_for_selector('.card')
        def overflow(tag):
            o = page.evaluate("document.documentElement.scrollWidth - innerWidth")
            if o>1: fails.append((name,tag,f'horizontal overflow {o}px'))
        overflow('main')
        inside(page, vis_box(page,'.top-actions .btn',0),'header Sales btn',name)
        inside(page, vis_box(page,'.top-actions .btn',1),'header Settings btn',name)
        for i in range(3): page.locator('.card').nth(i).click()
        sheet = page.evaluate("document.querySelector('.app').classList.contains('sheet-mode')")
        if sheet:
            inside(page, vis_box(page,'.cartbar .btn.primary'),'cartbar Pay',name)
            inside(page, vis_box(page,'.cartbar-info'),'cartbar info',name)
            if name in SHOT: page.screenshot(path=f'{SHOTS}/{name}-main.png')
            page.locator('.cartbar-info').click(); page.wait_for_timeout(350)
            inside(page, vis_box(page,'.order.open .pay'),'sheet Pay btn',name)
            line_clip(page,name,'sheet rows')
            inside(page, vis_box(page,'.order.open .order-head'),'sheet header',name)
            if name in SHOT: page.screenshot(path=f'{SHOTS}/{name}-sheet.png')
            page.locator('.order.open .sheet-close').click(); page.wait_for_timeout(350)
            page.locator('.cartbar .btn.primary').click()
        else:
            inside(page, vis_box(page,'.order .pay'),'order Pay btn',name)
            line_clip(page,name,'split rows')
            inside(page, vis_box(page,'.order .row.big'),'order total',name)
            if name in SHOT: page.screenshot(path=f'{SHOTS}/{name}-main.png')
            page.locator('.order .pay').click()
        page.wait_for_selector('.pay-modal')
        if name in SHOT: page.screenshot(path=f'{SHOTS}/{name}-pay.png')
        inside(page, vis_box(page,'.pay-done'),'Complete Sale btn',name)
        inside(page, vis_box(page,'.pay-modal'),'pay modal',name)
        for k in ['1','0','0','0']: page.keyboard.press(k)
        if page.locator('.pay-done').is_disabled(): fails.append((name,'Complete Sale','still disabled after 1000'))
        inside(page, vis_box(page,'.pay-done'),'Complete Sale (enabled)',name)
        # on-screen pad reachable? last pad key must be scroll-reachable
        page.locator('.pay-body .pad button').last.scroll_into_view_if_needed()
        page.locator('.pay-done').click(); page.wait_for_selector('.change-banner')
        if name in SHOT: page.screenshot(path=f'{SHOTS}/{name}-receipt.png')
        inside(page, vis_box(page,'.modal-foot .btn.primary'),'New Order btn',name)
        page.get_by_text('New Order').click()
        page.get_by_role('button',name='Sales').click(); page.wait_for_selector('.stats')
        inside(page, vis_box(page,'.modal-foot .btn.primary'),'Sales Close btn',name)
        if page.locator('.hist').count()!=1: fails.append((name,'history','sale not listed'))
        if name in SHOT: page.screenshot(path=f'{SHOTS}/{name}-sales.png')
        page.get_by_role('button',name='Close',exact=True).click()
        page.get_by_role('button',name='Settings').click(); page.wait_for_selector('.modal.wide')
        inside(page, vis_box(page,'.modal.wide .modal-foot .btn.primary'),'Settings Done btn',name)
        page.get_by_role('button',name='Menu',exact=True).click()
        if name in SHOT: page.screenshot(path=f'{SHOTS}/{name}-settings.png')
        sw = page.evaluate("(()=>{const m=document.querySelector('.modal.wide');return m.scrollWidth-m.clientWidth})()")
        if sw>1: fails.append((name,'settings modal','content wider than modal by %dpx'%sw))
        sw = page.evaluate("(()=>{const m=document.querySelector('.modal.wide .scroll');return m.scrollWidth-m.clientWidth})()")
        if sw>1: fails.append((name,'settings body','horizontal scroll %dpx'%sw))
        overflow('settings')
        if errs: fails.append((name,'console/page errors',errs[:2]))
        ctx.close()
    br.close()
print("VIEWPORTS:",len(VIEWS)); print("FAILS:",len(fails))
for f in fails: print(" -",*f)
