import json

# Load the updated JSON data
with open('src/data/foxe_studio_pipeline.json', 'r', encoding='utf-8') as f:
    pipeline_data = json.load(f)

# Load index.html
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

newline = '\r\n' if '\r\n' in content else '\n'
lines = content.split(newline)

# Find boundaries of FOXE_PIPELINE_DATA
start_line = None
end_line = None
for i, line in enumerate(lines):
    if 'const FOXE_PIPELINE_DATA = [' in line:
        start_line = i
    if start_line and i > start_line and 'let currentAppMode =' in line:
        end_line = i - 1
        break

print(f'FOXE_PIPELINE_DATA: lines {start_line+1} to {end_line+1}')

# Build new data block
data_json = json.dumps(pipeline_data, ensure_ascii=False, indent=2)
new_block = '    const FOXE_PIPELINE_DATA = ' + data_json + ';'

# Replace lines
new_lines = lines[:start_line] + [new_block] + lines[end_line+1:]
new_content = newline.join(new_lines)

# Fix 1: Fix production_window logic (range -> exact days)
old_produksi = 'const produksiWeeks = FOXE_PIPELINE_DATA.filter(w => iso >= w.production_window.start && iso <= w.production_window.end);'
new_produksi = 'const produksiWeeks = FOXE_PIPELINE_DATA.filter(w => w.production_window && w.production_window.days && w.production_window.days.includes(iso));'
if old_produksi in new_content:
    new_content = new_content.replace(old_produksi, new_produksi)
    print('Production filter logic: REPLACED OK')
else:
    print('WARNING: old_produksi string NOT found!')

# Fix 2: Fix the label display in produksi card panel (if present)
old_label = 'w.production_window.label'
new_label = "(w.production_window.label || '2 Hari Produksi')"
# Only replace in the card view section (not just any occurrence)
# Find the line with production_window.label for the card view
for i, ln in enumerate(new_content.split(newline)):
    if 'production_window.label' in ln:
        print(f'  Line {i+1}: {ln.strip()}')

# Fix 3: Update badge HTML to show day_detail title
# Find and replace the produksi badge section
badge_marker = '<!-- Produksi Konten Badge -->'
if badge_marker in new_content:
    # Find the badge block boundaries using a marker approach
    badge_start = new_content.find(badge_marker)
    # Find the closing of this block - after the .join('')}
    # We search for the pattern ending
    badge_end_search = "}).join('')}"
    badge_end_pos = new_content.find(badge_end_search, badge_start)
    
    if badge_end_pos == -1:
        # Try alternate ending
        badge_end_search2 = "`).join('')}"
        badge_end_pos = new_content.find(badge_end_search2, badge_start)
        badge_end_pos += len(badge_end_search2)
        print(f'Found badge block ending at pos {badge_end_pos}')
    else:
        badge_end_pos += len(badge_end_search)
        print(f'Found badge block ending at pos {badge_end_pos}')
    
    old_badge_block = new_content[badge_start:badge_end_pos]
    print("OLD BADGE BLOCK:")
    print(repr(old_badge_block[:300]))
    
    new_badge_block = """<!-- Produksi Konten Badge (2 Hari/Mgg: Sen & Rab) -->
              ${produksiWeeks.map(w => {
                const dd = w.production_window.day_details && w.production_window.day_details.find(d => d.date === iso);
                const lbl = dd ? dd.title : ('Produksi: ' + w.event_title.split('&')[0].trim());
                return `<div class="w-full text-left px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-50 text-purple-700 border border-purple-100 truncate flex items-center gap-1" title="Produksi Konten: ${w.event_title}">
                  <span class="w-1 h-1 rounded-full bg-purple-400 shrink-0"></span>
                  <span class="truncate">🎨 ${lbl}</span>
                </div>`;
              }).join('')}"""
    
    new_content = new_content[:badge_start] + new_badge_block + new_content[badge_end_pos:]
    print('Badge block: REPLACED OK')
else:
    print('WARNING: Badge marker not found!')

# Write result
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('\nDone!')
if 'production_window.days' in new_content:
    print('✓ production_window.days logic present')
if 'production_window.end' not in new_content:
    print('✓ Old range logic (production_window.end) removed')
else:
    print('WARNING: production_window.end still present!')
