const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../assets/app.js'), 'utf8');
const note = {id:'2026-09-17-morning-brief', title:'Morning edition', stories:[
  {title:'Keycloak & identity', kicker:'IAM', summary:'A summary', why:'Context', source:'Source', url:'https://example.com/source'},
  {title:'Second highlight'}
]};

function app(navigator = {}) {
  const context = vm.createContext({URL, URLSearchParams, navigator,
    document:{addEventListener(){}, getElementById(){return null;}},
    window:{addEventListener(){}}, location:{hash:'',href:'https://preview.invalid/?tracking=123'},
    requestAnimationFrame: callback => callback()
  });
  vm.runInContext(source, context);
  return context;
}
function control(action='copy') {
  const status={textContent:''}, fallback={hidden:true,focus(){this.focused=true;},select(){this.selected=true;}};
  const group={dataset:{shareUrl:'https://identityfieldnotes.com/article.html?id=note#story-2',shareTitle:'Specific highlight'},
    querySelector:selector=>selector==='.ifn-share-status'?status:fallback};
  const button={dataset:{shareAction:action},closest:()=>group};
  return {event:{target:{closest:()=>button}},group,status,fallback};
}
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

test('whole-note permalink is pinned to IFN and its edition, not the homepage',()=>{
  assert.equal(app().noteShareUrl(note),'https://identityfieldnotes.com/article.html?id=2026-09-17-morning-brief');
  const url=new URL(app().noteShareUrl({id:'id &?# value'}));
  assert.equal(url.searchParams.get('id'),'id &?# value');
  assert.equal(url.hash,'');
});
test('each story gets a matching deep-link target without changing source links',()=>{
  const a=app();
  note.stories.forEach((s,i)=>{
    assert.equal(new URL(a.noteShareUrl(note,i)).hash,`#story-${i+1}`);
    assert.match(a.story(s,false,note,i),new RegExp(`id="story-${i+1}" tabindex="-1"`));
  });
  assert.match(a.story(note.stories[0],false,note,0),/href="https:\/\/example.com\/source"/);
  assert.doesNotMatch(a.story(note.stories[0]),/data-share-url/);
});
test('LinkedIn, X and email all share the IFN deep link',()=>{
  const a=app(),markup=a.shareTools(note,0),target=a.noteShareUrl(note,0);
  const links=[...markup.matchAll(/href="([^"]+)"/g)].map(x=>new URL(decode(x[1])));
  assert.equal(links.length,3);
  assert.equal(links[0].hostname,'www.linkedin.com');
  assert.equal(links[0].searchParams.get('url'),target);
  assert.equal(links[1].searchParams.get('url'),target);
  assert.equal(links[1].searchParams.get('text'),'Keycloak & identity | Identity Field Notes');
  assert.equal(links[2].protocol,'mailto:');
  assert.ok(links[2].searchParams.get('body').includes(target));
  assert.doesNotMatch(markup,/data-share-action="native"/);
});
test('untrusted titles cannot inject markup or email headers',()=>{
  const title='"<img src=x onerror=alert(1)>\r\nBcc: attacker@example.com';
  const markup=app().shareTools({...note,title});
  assert.doesNotMatch(markup,/<img/);
  const email=new URL(decode(markup.match(/href="(mailto:[^"]+)"/)[1]));
  assert.doesNotMatch(email.searchParams.get('subject'),/[\r\n]/);
  assert.equal([...email.searchParams.keys()].join(','),'subject,body');
});
test('copy writes the IFN URL and announces success',async()=>{
  let copied;
  const c=control();
  await app({clipboard:{writeText:async value=>{copied=value;}}}).handleShareClick(c.event);
  assert.equal(copied,c.group.dataset.shareUrl);
  assert.equal(c.status.textContent,'IFN link copied.');
  assert.equal(c.fallback.hidden,true);
});
test('clipboard rejection offers a selected, read-only manual copy field',async()=>{
  const c=control();
  await app({clipboard:{writeText:async()=>{throw new Error('Denied');}}}).handleShareClick(c.event);
  assert.equal(c.fallback.hidden,false);
  assert.equal(c.fallback.focused,true);
  assert.equal(c.fallback.selected,true);
  assert.match(c.status.textContent,/Select and copy/);
});
test('missing clipboard API also offers manual copy',async()=>{
  const c=control();
  await app().handleShareClick(c.event);
  assert.equal(c.fallback.selected,true);
});
test('native sharing uses the story title and IFN URL',async()=>{
  let payload;
  const a=app({share:async data=>{payload=data;}}),c=control('native');
  assert.match(a.shareTools(note),/data-share-action="native"/);
  await a.handleShareClick(c.event);
  assert.equal(payload.url,c.group.dataset.shareUrl);
  assert.equal(payload.title,'Specific highlight | Identity Field Notes');
});
test('canceling the share sheet does not copy or show an error',async()=>{
  const c=control('native');
  await app({share:async()=>{throw {name:'AbortError'};}}).handleShareClick(c.event);
  assert.equal(c.fallback.hidden,true);
  assert.equal(c.status.textContent,'');
});
test('native share failure leaves a usable manual link',async()=>{
  const c=control('native');
  await app({share:async()=>{throw {name:'NotAllowedError'};}}).handleShareClick(c.event);
  assert.equal(c.fallback.selected,true);
});
test('asynchronously rendered story anchors scroll and receive keyboard focus',()=>{
  const a=app();let scrolled=false,focused=false;
  a.location.hash='#story-2';
  a.document.getElementById=id=>{
    assert.equal(id,'story-2');
    return {scrollIntoView(){scrolled=true;},focus(opts){focused=opts.preventScroll;}};
  };
  a.scrollToSharedStory();
  assert.equal(scrolled,true);assert.equal(focused,true);
});
test('unrelated and missing hashes are left alone',()=>{
  const a=app();
  a.location.hash='#corrections';
  a.document.getElementById=()=>{throw new Error('Must not query unrelated anchor');};
  a.scrollToSharedStory();
  a.location.hash='#story-99';a.document.getElementById=()=>null;
  assert.doesNotThrow(()=>a.scrollToSharedStory());
});
