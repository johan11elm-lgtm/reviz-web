# Ombre d'un accessoire sur le front du pantin (lancer depuis public/pantin).
# Retenu le 22/10 pour explorateur : double((50,22,.6),(10,5,.45)), rognée à sa bbox,
# placée en px des calques (x2) dans ACCESSOIRES de src/components/Pantin.jsx.
from PIL import Image, ImageFilter
import numpy as np, sys
S=sys.argv[1]; M=100
corps=Image.open('corps.webp').convert('RGBA').split()[3]
hat=Image.open('accessoires/explorateur.webp').convert('RGBA')
x,y,w,h=[v/2 for v in (301,-38,1919,948)]
hs=hat.resize((round(w),round(h)),Image.LANCZOS)
def ombre(dy, sigma, force):
  a=Image.new('L',(1254,1254+M),0); a.paste(hs.split()[3],(round(x),round(y)+M+dy))
  a=a.filter(ImageFilter.GaussianBlur(sigma))
  c=Image.new('L',(1254,1254+M),0); c.paste(corps,(0,M))
  al=np.clip((np.asarray(a,float)/255)*force,0,1)*(np.asarray(c,float)/255)
  rgba=np.zeros((1254+M,1254,4),np.uint8); rgba[...,:3]=(120,62,32); rgba[...,3]=(al*255).astype(np.uint8)
  return Image.fromarray(rgba)
def compo(o):
  f=Image.new('RGBA',(1254,1254+M),(248,239,231,255))
  for n in ['jambes','corps','sous-sourcils','sourcils','bouche-repos']:
    t=Image.open(n+'.webp').convert('RGBA'); f.paste(t,(0,M),t)
  if o: f.alpha_composite(o)
  f.paste(hs,(round(x),round(y)+M),hs)
  return f.crop((100,0,1154,800)).resize((527,400))
if __name__=='__main__':
  vs=[eval(v) for v in sys.argv[2:]]
  out=Image.new('RGBA',(527*len(vs),400))
  for i,v in enumerate(vs): out.paste(compo(ombre(*v) if v else None),(i*527,0))
  out.save(f'{S}/ombres.png')

def double(a, b):
  o1=np.asarray(ombre(*a),float); o2=np.asarray(ombre(*b),float)
  al=1-(1-o1[...,3]/255)*(1-o2[...,3]/255); out=o1.copy(); out[...,3]=al*255
  return Image.fromarray(out.astype(np.uint8))
