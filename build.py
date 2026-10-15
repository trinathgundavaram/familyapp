import re,os
d=os.path.dirname(os.path.abspath(__file__))+'/src/'
css=open(d+'app.css').read()
js=''
for f in ['10-core.js','20-pages-a.js','21-pages-b.js','22-money.js','23-food.js','24-pages-c.js','25-house.js','90-main.js']:
    s=open(d+f).read()
    s=s.replace("'use strict';\n",'',1) if s.startswith("'use strict'") else s
    if f=='23-food.js': s=s.replace('/*FOODS*/',open(d+'foods.txt').read().strip())
    js+=s+'\n'
t=open(d+'shell.tpl.html').read().replace('/*CSS*/',css).replace('/*JS*/',js)
os.makedirs(os.path.dirname(os.path.abspath(__file__))+'/out',exist_ok=True)
open(os.path.dirname(os.path.abspath(__file__))+'/out/index.html','w').write(t)
open('/tmp/chk.js','w').write(js)
print(len(t))
