"""Extract compact JSON from the Flysta3D-v2 (Wang et al., Cell 2025) supplementary tables.

Usage: python extract_bgi.py <bgi_supplementary_dir> <out.js>
mmc2 = Table S2 (annotations), mmc3 = S3 (Stereo-only genes), mmc4 = S4 (subclusters),
mmc5 = S5 (common markers), mmc6 = S6 (cell-type TFs), mmc7 = S7 (CNS morphometrics),
mmc8 = S8 (exex/lab motif peaks), mmc10 = colour codes.
"""
import json, re, sys
import pandas as pd

base, out = sys.argv[1], sys.argv[2]
J = {}

# ---- colours
col = pd.read_excel(f"{base}/mmc10.xlsx", sheet_name=None)
J["tissueColors"] = {r["Tissue"].lower(): r["Hex code"] for _, r in col["Tissues"].iterrows()}
ct = col["Cell types"]
cell_colors = {}
for _, r in ct.iterrows():
    for c in ct.columns[:3]:
        if pd.notna(r[c]):
            cell_colors[str(r[c]).strip().lower().replace("−", "-")] = r["Hex code"]
J["cellColors"] = cell_colors

# ---- Stereo-seq samples (Table S2 sheet 2)
a = pd.read_excel(f"{base}/mmc2.xlsx", sheet_name="2.scStereo-seq annos", header=None)
samples, cur = [], None
for _, r in a.iloc[1:].iterrows():
    v = str(r[0])
    if v.startswith("Original sample ID"):
        m = re.search(r"ID:\s*([^;]+);\s*RAPToR inferred age:\s*([^;]+?)\s*h?;\s*Inferred embryonic stage:\s*([^;]*)", v)
        sid, age, stage = m.group(1).strip(), m.group(2).strip(), m.group(3).strip()
        cur = {"id": sid, "age": None if "—" in age else float(age),
               "stage": int(re.sub(r"\D", "", stage)) if re.search(r"\d", stage) else None,
               "tissues": {}}
        samples.append(cur)
    elif cur is not None and pd.notna(r[2]):
        t = str(r[2]).strip().lower().replace("cellsular", "cellular")
        cur["tissues"][t] = cur["tissues"].get(t, 0) + 1
for s in samples:
    s["tissues"] = sorted(s["tissues"].items(), key=lambda kv: -kv[1])
J["samples"] = samples

# ---- subclusters (Table S4) + common markers (S5)
sub = pd.read_excel(f"{base}/mmc4.xlsx", sheet_name="2.scRNA-seq subcluster annos")
subA = pd.read_excel(f"{base}/mmc4.xlsx", sheet_name="4.scATAC-seq subcluster annos")
common = pd.read_excel(f"{base}/mmc5-4.xlsx")
common.columns = ["sub", "marker"]
cm = common.groupby(common["sub"].str.lower())["marker"].apply(lambda x: list(dict.fromkeys(map(str, x)))[:10]).to_dict()
tissues = {}
for kind, df in (("RNA", sub), ("ATAC", subA)):
    for _, r in df.iterrows():
        if pd.isna(r["subcluster annotation"]):
            continue
        t = str(r["tissue"]).strip()
        name = str(r["subcluster annotation"]).strip()
        mk = str(r["notable subcluster markers"]) if pd.notna(r["notable subcluster markers"]) else ""
        ref = str(r["references"]) if "references" in df.columns and pd.notna(r["references"]) else ""
        tissues.setdefault(t, []).append({"k": kind, "n": name, "m": mk, "r": ref,
                                          "c": cm.get(name.lower(), [])})
J["subclusters"] = tissues

# ---- Stereo-seq midgut subclusters (larva / pupa)
mg = pd.read_excel(f"{base}/mmc4.xlsx", sheet_name="6.scStereo-seq midgut annos")
J["midgutLarva"] = {k: sorted(set(map(str, v)) - {"unknown"}) for k, v in mg.groupby("cell type")["annotation"]}

# ---- cell-type TFs (Table S6): top unique TFs per cell type
tf = pd.read_excel(f"{base}/mmc6.xlsx", header=1)
tf["TF"] = tf["TF.motif"].astype(str).str.replace(r"\.\d+$", "", regex=True)
tfs = {}
for (gl, cl), d in tf.groupby(["germ layer", "cluster"]):
    d = d.sort_values(["p_val_adj_diff", "avg_diff"], ascending=[True, False]).drop_duplicates("TF")
    rows = []
    for _, r in d.head(10).iterrows():
        rows.append({"tf": r["TF"], "diff": round(float(r["avg_diff"]), 2),
                     "fe": round(float(r["fold.enrichment"]), 2) if pd.notna(r["fold.enrichment"]) else None,
                     "sig": bool(pd.notna(r["p_val_adj_enrich"]) and r["p_val_adj_enrich"] < 0.05)})
    tfs[str(cl).strip()] = {"germ": gl, "tfs": rows}
J["cellTFs"] = tfs

# ---- CNS morphometrics (Table S7)
mo = pd.read_excel(f"{base}/mmc7-4.xlsx", sheet_name="CNS")
morph = {}
for (stg, met), d in mo.groupby(["stage", "morphometrics"], sort=False):
    d = d.sort_values(["qval", "log-likelihood"], ascending=[True, False])
    morph.setdefault(stg, {})[met] = d["gene"].astype(str).head(8).tolist()
J["cnsMorph"] = morph

# ---- exex / lab motif peaks (Table S8)
ex = pd.read_excel(f"{base}/mmc8-2.xlsx")
J["exexCounts"] = ex["type"].value_counts().to_dict()
J["exexDualUp"] = (ex[ex["type"] == "dual_up"].sort_values("avg_log2FC", ascending=False)
                   .drop_duplicates("gene").head(24)[["gene", "avg_log2FC"]]
                   .round(2).values.tolist())

# ---- Stereo-only genes (Table S3)
s3 = pd.read_excel(f"{base}/mmc3.xlsx")
J["stereoGenes"] = [[str(r["gene"]),
                     str(r["cell type enrichment (occurrences)"]) if pd.notna(r["cell type enrichment (occurrences)"]) else "",
                     str(r["tissue enrichment (occurrences)"]) if pd.notna(r["tissue enrichment (occurrences)"]) else ""]
                    for _, r in s3.iterrows()]

with open(out, "w") as fh:
    fh.write("window.BGI=" + json.dumps(J, separators=(",", ":"), ensure_ascii=False) + ";\n")
print({k: (len(v) if hasattr(v, "__len__") else v) for k, v in J.items()})
print(samples[10])
print(list(tfs.items())[:2])
print(list(morph.items())[0])
