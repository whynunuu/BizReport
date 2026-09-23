import json
import re

def update_index_html():
    with open("src/data/foxe_studio_pipeline.json", "r", encoding="utf-8") as f:
        pipeline_data = json.load(f)

    with open("index.html", "r", encoding="utf-8") as f:
        html = f.read()

    # 1. Update FOXE_PIPELINE_DATA
    json_str = json.dumps(pipeline_data, indent=2, ensure_ascii=False)
    data_def = f"const FOXE_PIPELINE_DATA = {json_str};\n"

    pattern_data = re.compile(r"const FOXE_PIPELINE_DATA = \[[\s\S]*?\];\s*(?=\n\s*// =========================================================================\s*\n\s*// APPLICATION STATE)", re.MULTILINE)
    if not pattern_data.search(html):
        print("Error: Could not find FOXE_PIPELINE_DATA in index.html")
        return False
    html = pattern_data.sub(data_def, html)

    # 2. Update Header banner text to reflect 2 hari produksi
    html = html.replace(
        "Aturan Operasional: <strong>Produksi Konten H-14 s.d H-10</strong> sebelum event. <strong>Upload Iklan/Konten H-7 s.d H-5</strong> (Frekuensi: <strong>3x Konten per Minggu</strong>).",
        "Aturan Operasional: <strong>Produksi Konten: 2 Hari per Minggu (Senin & Rabu)</strong>. <strong>Upload Iklan/Konten: 3x per Minggu (Selasa, Kamis, Sabtu)</strong>."
    )

    # 3. Update legend in index.html
    html = html.replace(
        "Produksi Konten (H-14 s.d H-10)",
        "Produksi Konten (2 Hari/Mgg: Sen & Rab)"
    )

    # 4. Update renderFoxeCalendarGrid in index.html
    old_prod_logic = """        // 2. Produksi Window (start <= iso <= end)
        const produksiWeeks = FOXE_PIPELINE_DATA.filter(w => iso >= w.production_window.start && iso <= w.production_window.end);"""
    
    new_prod_logic = """        // 2. Produksi Konten (Tepat 2 Hari per Minggu: Senin & Rabu)
        const produksiItems = [];
        FOXE_PIPELINE_DATA.forEach(w => {
          if (w.production_window && w.production_window.days && w.production_window.days.includes(iso)) {
            const detail = w.production_window.day_details ? w.production_window.day_details.find(d => d.date === iso) : null;
            produksiItems.push({
              week: w,
              title: detail ? detail.title : `Produksi: ${w.event_title.split('&')[0].trim()}`
            });
          }
        });"""

    if old_prod_logic in html:
        html = html.replace(old_prod_logic, new_prod_logic)
    else:
        print("Warning: old_prod_logic exact string not found, doing regex replacement")
        html = re.sub(r"// 2\. Produksi Window[\s\S]*?w\.production_window\.end\);", new_prod_logic, html)

    # Replace the badge rendering for produksi
    old_prod_badge = """              <!-- Produksi Konten Badge -->
              ${produksiWeeks.map(w => `
                <div class="w-full text-left px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-50 text-purple-700 border border-purple-100 truncate flex items-center gap-1" title="Periode Produksi: ${w.event_title}">
                  <span class="w-1 h-1 rounded-full bg-purple-400 shrink-0"></span>
                  <span class="truncate">🎨 Produksi: ${w.event_title.split('&')[0].trim()}</span>
                </div>
              `).join('')}"""

    new_prod_badge = """              <!-- Produksi Konten (2 Hari per Minggu) -->
              ${produksiItems.map(item => `
                <div class="w-full text-left px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 truncate flex items-center gap-1 shadow-2xs" title="${item.title}">
                  <span class="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0"></span>
                  <span class="truncate">🎨 ${item.title}</span>
                </div>
              `).join('')}"""

    if old_prod_badge in html:
        html = html.replace(old_prod_badge, new_prod_badge)
    else:
        print("Warning: old_prod_badge exact string not found, doing regex replacement")
        html = re.sub(r"<!-- Produksi Konten Badge -->[\s\S]*?produksiWeeks\.map[\s\S]*?`\)\.join\(''\)}", new_prod_badge, html)

    with open("index.html", "w", encoding="utf-8") as f:
        f.write(html)
    print("Updated index.html successfully with 2-day production schedule.")
    return True

if __name__ == "__main__":
    update_index_html()
