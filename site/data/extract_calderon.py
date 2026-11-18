import pandas as pd, json, sys, re
base=sys.argv[1]; out=sys.argv[2]
s1=pd.read_excel(f'{base}/science.abn5800_table_s1.xlsx',header=1)
s1.columns=['win','cl','auto','p','auto78','p2','ann','germ','other','comm','hex']
s1=s1.dropna(subset=['ann'])
s3=pd.read_excel(f'{base}/science.abn5800_table_s3.xlsx',header=1)
s3['win']=s3['time'].str.replace('_markers.txt','').str.replace('_','-')
s3=s3[(s3.p_val_adj<0.05)]
order=['0-2','2-4','4-6','6-8','8-10','10-12','12-14','14-16','16-18','18-20']
res={}
for w in order:
    sub=s1[s1.win==w]; items={}
    for _,r in sub.iterrows():
        a=str(r.ann).strip(); it=items.setdefault(a,{'name':a,'germ':str(r.germ) if pd.notna(r.germ) else 'unknown','hex':str(r.hex).strip(),'clusters':[]})
        it['clusters'].append(int(r.cl))
    for a,it in items.items():
        m=s3[(s3.win==w)&(s3.cluster.isin(it['clusters']))].copy()
        m['score']=m.avg_log2FC*(m['pct.1']-m['pct.2'])
        g=m.sort_values('score',ascending=False).drop_duplicates('gene').gene.astype(str).head(8).tolist()
        it['markers']=g; it['n']=len(it['clusters']); del it['clusters']
    res[w]=sorted(items.values(),key=lambda x:(x['germ'],x['name']))
json.dump(res,open(out,'w'),indent=0)
print({w:len(v) for w,v in res.items()})
print(res['10-12'][:4])
