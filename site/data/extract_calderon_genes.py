"""Gene-keyed index of ALL significant Calderon et al. 2022 markers (Table S3).

calderon_states.js keeps only the top 8 markers per annotated state (for display).
This file keeps every significant marker (adj. p < 0.05) of every annotated state,
so gene cards can answer "in which states/windows is gene X a marker?".

Output: data/calderon_genes.js
  window.CALDERON_GENES = {
    states: [[window, annotation, hex, germ], ...],
    genes:  { gene: [[stateIndex, rank, log2FC], ...] }   # rank 1 = best in that state
  }
Ranking matches extract_calderon.py: avg_log2FC * (pct.1 - pct.2), best cluster per gene.
Usage: python extract_calderon_genes.py <dir with science.abn5800_table_s*.xlsx> <out.js>
Requires pandas + openpyxl.
"""
import json, sys
import pandas as pd

base, out = sys.argv[1], sys.argv[2]
s1 = pd.read_excel(f"{base}/science.abn5800_table_s1.xlsx", header=1)
s1.columns = ["win", "cl", "auto", "p", "auto78", "p2", "ann", "germ", "other", "comm", "hex"]
s1 = s1.dropna(subset=["ann"])
s3 = pd.read_excel(f"{base}/science.abn5800_table_s3.xlsx", header=1)
s3 = s3[s3.time.str.endswith("_markers.txt") & ~s3.time.str.contains("_top_")].copy()
s3["win"] = s3.time.str.replace("_markers.txt", "", regex=False).str.replace("_", "-")
s3 = s3[s3.p_val_adj < 0.05]
s3["score"] = s3.avg_log2FC * (s3["pct.1"] - s3["pct.2"])

order = ["0-2", "2-4", "4-6", "6-8", "8-10", "10-12", "12-14", "14-16", "16-18", "18-20"]
states, genes = [], {}
for w in order:
    sub = s1[s1.win == w]
    for ann, grp in sub.groupby(sub.ann.astype(str).str.strip(), sort=True):
        r = grp.iloc[0]
        si = len(states)
        states.append([w, ann, str(r.hex).strip(), str(r.germ) if pd.notna(r.germ) else "unknown"])
        m = s3[(s3.win == w) & (s3.cluster.isin(grp.cl.astype(int)))]
        m = m.sort_values("score", ascending=False).drop_duplicates("gene")
        for rank, (_, x) in enumerate(m.iterrows(), 1):
            genes.setdefault(str(x.gene), []).append([si, rank, round(float(x.avg_log2FC), 2)])

with open(out, "w") as f:
    f.write("window.CALDERON_GENES=")
    json.dump({"states": states, "genes": genes}, f, separators=(",", ":"))
    f.write(";\n")
n = sum(len(v) for v in genes.values())
print(f"{len(states)} states, {len(genes)} genes, {n} gene-state pairs")
for g in ["twi", "Mef2", "GATAe", "elav", "btl", "srp"]:
    print(g, [(states[s][0], states[s][1], r) for s, r, _ in genes.get(g, [])][:6])
