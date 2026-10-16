"""Check published HTML, internal links, canonical URLs and sitemap coverage."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, unquote
from collections import defaultdict
import json
import xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://printgridpaper.com'
class Page(HTMLParser):
    def __init__(self, file):
        super().__init__(convert_charrefs=True)
        self.file, self.ids, self.links, self.assets = file, set(), [], []
        self.canonicals, self.titles, self.h1s, self.descriptions = [], [], [], []
        self.active, self.text, self.errors = None, [], []
        self.feed(file.read_text())
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            if a['id'] in self.ids: self.errors.append('duplicate id: ' + a['id'])
            self.ids.add(a['id'])
        if tag == 'a' and a.get('href'): self.links.append(a['href'])
        if tag in ('img', 'script') and a.get('src'): self.assets.append(a['src'])
        if tag == 'link' and a.get('rel') == 'stylesheet': self.assets.append(a.get('href', ''))
        if tag == 'link' and a.get('rel') == 'canonical': self.canonicals.append(a.get('href'))
        if tag == 'meta' and a.get('name') == 'description': self.descriptions.append(a.get('content', ''))
        if tag in ('h1', 'title'): self.active, self.text = tag, []
        if tag == 'script' and a.get('type') == 'application/ld+json': self.active, self.text = 'json', []
    def handle_data(self, data):
        if self.active: self.text.append(data)
    def handle_endtag(self, tag):
        if self.active == tag:
            (self.h1s if tag == 'h1' else self.titles).append(''.join(self.text).strip())
            self.active = None
        if tag == 'script' and self.active == 'json':
            try: json.loads(''.join(self.text))
            except ValueError: self.errors.append('invalid JSON-LD')
            self.active = None
files = [ROOT/'index.html'] + sorted(p for p in ROOT.glob('*/index.html') if p.parent.name not in ('node_modules', 'worker', 'tools'))
pages = {('/' if p.parent == ROOT else '/' + p.parent.name + '/'): Page(p) for p in files}
errors, titles, descriptions, graph = [], defaultdict(list), defaultdict(list), defaultdict(set)
for route, page in pages.items():
    errors.extend(f'{route}: {e}' for e in page.errors)
    if page.canonicals != [SITE + route]: errors.append(f'{route}: canonical does not match route')
    if len(page.h1s) != 1 or not page.h1s[0]: errors.append(f'{route}: expected one nonempty H1')
    if len(page.titles) != 1 or not page.titles[0]: errors.append(f'{route}: expected one nonempty title')
    if len(page.descriptions) != 1 or not page.descriptions[0]: errors.append(f'{route}: missing description')
    for title in page.titles: titles[title].append(route)
    for desc in page.descriptions: descriptions[desc].append(route)
    for href in page.links + page.assets:
        url = urlsplit(urljoin(SITE + route, href))
        if url.netloc != 'printgridpaper.com' or url.scheme not in ('http','https'): continue
        if url.path.startswith('/api/'): continue
        path = unquote(url.path)
        if path in pages:
            if href in page.links: graph[route].add(path)
            # JSON settings fragments are state, not HTML anchors.
            fragment = unquote(url.fragment)
            if fragment and not fragment.startswith('{') and fragment not in pages[path].ids:
                errors.append(f'{route}: missing anchor {href}')
        elif not (ROOT / path.lstrip('/')).is_file(): errors.append(f'{route}: missing target {href}')
for kind, values in [('title',titles),('description',descriptions)]:
    for text, routes in values.items():
        if len(routes)>1: errors.append(f'duplicate {kind}: {", ".join(routes)}')
ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
sitemap={e.text for e in ET.parse(ROOT/'sitemap.xml').findall('s:url/s:loc',ns)}
expected={SITE + route for route in pages}
for missing in expected - sitemap: errors.append('missing from sitemap: '+missing)
for extra in sitemap - expected: errors.append('sitemap target absent: '+extra)
seen, pending = set(), ['/']
while pending:
    route=pending.pop()
    if route not in seen: seen.add(route); pending.extend(graph[route]-seen)
for route in pages.keys()-seen: errors.append('unreachable from home: '+route)
if errors:
    print('\n'.join(errors)); raise SystemExit(1)
print(f'PASS: {len(pages)} pages; unique titles/descriptions, canonical URLs, sitemap coverage, internal links/anchors, assets, JSON-LD and homepage reachability.')
