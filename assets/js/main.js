// Saffron Blog interactions + Admin Dashboard
// Apply homepage hero settings from admin
(function(){
  const HOME_SETTINGS_KEY='home_settings';
  function readHomeSettings(){ try{ const raw=localStorage.getItem(HOME_SETTINGS_KEY); return raw?JSON.parse(raw):null; }catch{ return null; } }
  const s=readHomeSettings();
  if(!s) return;
  const hero=document.querySelector('.hero');
  if(hero){
    const img=hero.querySelector('img');
    const h1=hero.querySelector('h1');
    const h1Link=hero.querySelector('h1 a');

    if(s.imageDataUrl && img){ img.src=s.imageDataUrl; img.alt=((s.title||'Featured post')+' cover'); }
    if(typeof s.title==='string' && s.title.trim()){
      if(h1Link){ h1Link.textContent=s.title.trim(); }
      else if(h1){ h1.textContent=s.title.trim(); }
    }
  }
})();

(function(){
  // Page routing
  const pages = Array.from(document.querySelectorAll('.page'));
  function show(id){pages.forEach(p=>p.classList.toggle('active', p.id===id));window.scrollTo({top:0,behavior:'smooth'});}  
  function handleHash(){
    const h=location.hash.substring(1);
    if(h && h.startsWith('post-')){ show('post'); showPostById(h.slice(5)); }
    else { show(h||'home'); }
  }
  handleHash();
  window.addEventListener('hashchange',handleHash);
  document.querySelector('.logo').addEventListener('click',()=>{location.hash='home'});

  // Storage helpers
  const STORAGE={posts:'saffron_posts',categories:'saffron_categories'};
  const load=(k,f)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):f;}catch(e){return f;}};
  const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};

  // Default categories and posts
  let categories=load(STORAGE.categories,['design','development','product','culture','uncategorized']);
  let posts=load(STORAGE.posts,[
    {id:'p1',title:'Whitespace in practice',cat:'design',excerpt:'How to use space to guide attention.',author:'Alex Lee',time:'6 min',img:'assets/svg/sample-cover-1.svg',content:'<p>Whitespace guides focus, improves comprehension, and brings calm to long-form content.</p><h2>Practical tips</h2><ul><li>Increase line-height</li><li>Limit line length</li><li>Use generous spacing</li></ul>'},
    {id:'p2',title:'Accessible color systems',cat:'design',excerpt:'Meeting WCAG AA+ with style.',author:'Maya Chen',time:'8 min',img:'assets/svg/sample-cover-2.svg',content:'<p>Design palettes that meet accessibility standards without sacrificing brand expression.</p>'},
    {id:'p3',title:'Next.js + Sanity setup',cat:'development',excerpt:'Headless CMS in minutes.',author:'Jamie Cruz',time:'9 min',img:'assets/svg/sample-cover-1.svg',content:'<p>Spin up Next.js and integrate Sanity for a flexible authoring workflow.</p>'},
    {id:'p4',title:'Gutenberg authoring tips',cat:'product',excerpt:'Craft long-form in WordPress.',author:'Priya Rao',time:'7 min',img:'assets/svg/sample-cover-2.svg',content:'<p>Structure content with semantic blocks and keep typography consistent.</p>'},
    {id:'p5',title:'Team writing culture',cat:'culture',excerpt:'Editing for clarity and tone.',author:'Sam Park',time:'5 min',img:'assets/svg/sample-cover-1.svg',content:'<p>Build a writing habit with regular reviews and shared style guides.</p>'}
  ]);

  // Header: category dropdown (dynamic)
  const ddBtn=document.getElementById('categoryDropdown');
  const ddMenu=document.getElementById('categoryMenu');
  const listCategory=document.getElementById('listCategory');
  const adminCategorySelect=document.getElementById('adminCategorySelect');
  const adminCategoriesList=document.getElementById('adminCategoriesList');
  const capitalize=s=>s? s.charAt(0).toUpperCase()+s.slice(1):'';

  function renderCategoriesUI(){
    // Header dropdown
    ddMenu.innerHTML='';
    ['all',...categories].forEach(cat=>{
      const li=document.createElement('li');
      const b=document.createElement('button');
      b.textContent=cat==='all'?'All':capitalize(cat);
      b.dataset.cat=cat;
      li.appendChild(b);
      ddMenu.appendChild(li);
    });
    // Listing filter select
    listCategory.innerHTML='';
    ['all',...categories].forEach(cat=>{
      const opt=document.createElement('option');
      opt.value=cat;opt.textContent=cat==='all'?'All':capitalize(cat);
      listCategory.appendChild(opt);
    });
    // Admin post category select
    adminCategorySelect.innerHTML='';
    categories.forEach(cat=>{
      const opt=document.createElement('option');
      opt.value=cat;opt.textContent=capitalize(cat);
      adminCategorySelect.appendChild(opt);
    });
    // Admin categories list
    adminCategoriesList.innerHTML='';
    categories.forEach(cat=>{
      const li=document.createElement('li');
      li.innerHTML=`<span>${capitalize(cat)}</span> <button class="danger-btn" data-delete-cat="${cat}" ${cat==='uncategorized'?'disabled':''}>Delete</button>`;
      adminCategoriesList.appendChild(li);
    });
  }

  ddBtn.addEventListener('click',()=>{const open=ddMenu.style.display==='block';ddMenu.style.display=open?'none':'block';ddMenu.classList.toggle('show',!open);ddBtn.setAttribute('aria-expanded',String(!open));});
  ddMenu.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const cat=b.dataset.cat||'all';location.hash='blog';listCategory.value=cat;filterList();ddMenu.style.display='none';ddBtn.setAttribute('aria-expanded','false');});
  document.addEventListener('click',e=>{if(!ddMenu.contains(e.target)&&e.target!==ddBtn){ddMenu.style.display='none';ddBtn.setAttribute('aria-expanded','false');}});

  // Search toggle
  const searchBtn=document.getElementById('searchBtn');
  const searchBar=document.getElementById('searchBar');
  searchBtn.addEventListener('click',()=>{const hidden=searchBar.hasAttribute('hidden');hidden?searchBar.removeAttribute('hidden'):searchBar.setAttribute('hidden','');document.getElementById('searchInput').focus();});

  // Newsletter modal
  const nl=document.getElementById('newsletterModal');
  document.getElementById('newsletterCTA').addEventListener('click',()=>{nl.removeAttribute('hidden');});
  document.getElementById('nlClose').addEventListener('click',()=>{nl.setAttribute('hidden','');});
  nl.querySelector('.nl-form').addEventListener('submit',e=>{e.preventDefault();alert('Subscribed!');nl.setAttribute('hidden','');});

  // Dark mode toggle
  const toggle=document.getElementById('themeToggle');
  const setDark=v=>document.documentElement.classList.toggle('dark',v);
  toggle.addEventListener('click',()=>{const d=!document.documentElement.classList.contains('dark');setDark(d);toggle.querySelector('img').src=d?'assets/svg/sun.svg':'assets/svg/moon.svg';});

  // Populate latest grid with Read Full Blog buttons
  function renderLatest(){
    const latest=document.getElementById('latestGrid');
    latest.innerHTML='';
    posts.slice(-6).reverse().forEach(p=>{
      const cover=p.img||p.image||'assets/svg/sample-cover-1.svg';
      const el=document.createElement('article');el.className='post-card';
      el.innerHTML=`<img loading="lazy" src="${cover}" alt="${p.title}"><div class="content"><span class="pill">${capitalize(p.cat)}</span><h3 class="headline"><a href="#post" data-id="${p.id}">${p.title}</a></h3><p class="excerpt">${p.excerpt}</p><p class="meta">By ${p.author} • ${p.time} read</p><div class="card-actions"><a class="cta" href="#post" data-id="${p.id}">Read Full Blog</a></div></div>`;
      latest.appendChild(el);
    });
  }

  // Listing page
  const listGrid=document.getElementById('listGrid');
  function renderList(items){
    listGrid.innerHTML='';
    items.forEach(p=>{
      const cover=p.img||p.image||'assets/svg/sample-cover-1.svg';
      const el=document.createElement('article');el.className='post-card';
      el.innerHTML=`<img loading="lazy" src="${cover}" alt="${p.title}"><div class="content"><span class="pill">${capitalize(p.cat)}</span><h3 class="headline"><a href="#post" data-id="${p.id}">${p.title}</a></h3><p class="excerpt">${p.excerpt}</p><p class="meta">By ${p.author} • ${p.time} read</p><div class="card-actions"><a class="cta" href="#post" data-id="${p.id}">Read Full Blog</a></div></div>`;
      listGrid.appendChild(el);
    });
  }
  function filterList(){const q=document.getElementById('listSearch').value.toLowerCase();const c=listCategory.value;renderList(posts.filter(p=>{const t=(p.title+' '+p.excerpt).toLowerCase();const catMatch=c==='all'||p.cat===c;return t.includes(q)&&catMatch;}));}
  document.getElementById('listSearch').addEventListener('input',filterList);
  listCategory.addEventListener('change',filterList);

  // Read Full Blog navigation (event delegation)
  function showPostById(id){
    const post=posts.find(p=>p.id===id)||posts[0];
    document.getElementById('postTitle').textContent=post.title;
    document.getElementById('postPill').textContent=capitalize(post.cat);
    document.getElementById('postMeta').textContent=`By ${post.author} • ${post.time} read`;
    const hero=document.getElementById('postHeroImg');const cover=post.img||post.image||'assets/svg/sample-cover-1.svg';hero.src=cover;hero.alt=post.title+' cover';
    document.getElementById('postContent').innerHTML=post.content||`<p>${post.excerpt}</p>`;
    document.getElementById('postAuthorName').textContent=post.author;
    const sList=document.getElementById('sidebarList');sList.innerHTML='';
    posts.filter(p=>p.id!==post.id).slice(0,5).forEach(p=>{const li=document.createElement('li');li.innerHTML=`<a href="#post" data-id="${p.id}">${p.title}</a>`;sList.appendChild(li);});
  }
  document.addEventListener('click',e=>{const a=e.target.closest('a[href="#post"]');if(!a)return;e.preventDefault();const id=a.dataset.id; if(id){showPostById(id);} location.hash='post';});

  // Admin: add/delete categories
  document.getElementById('addCategoryBtn').addEventListener('click',()=>{
    const input=document.getElementById('newCategoryInput');
    const name=input.value.trim().toLowerCase();
    if(!name)return;
    if(name==='all'){alert('Cannot use "All" as a category.');return;}
    if(categories.includes(name)){alert('Category already exists.');return;}
    categories.push(name);
    save(STORAGE.categories,categories);
    renderCategoriesUI();
    input.value='';
  });
  // Custom confirmation modal with Yes/Cancel
  // Shared confirm dialog for embedded admin
  function confirmDialog(message){
    return new Promise(resolve=>{
      const overlay=document.createElement('div'); overlay.className='confirm-overlay';
      const box=document.createElement('div'); box.className='confirm-box';
      box.innerHTML=`<p class="confirm-message">${message.replace(/\n/g,'<br>')}</p><div class="confirm-actions"><button class="danger-btn" data-yes>Yes</button><button class="cancel-btn" data-cancel>Cancel</button></div>`;
      overlay.appendChild(box); document.body.appendChild(overlay);
      const cleanup=()=>overlay.remove();
      overlay.addEventListener('click',e=>{ if(e.target===overlay){ cleanup(); resolve(false);} });
      box.querySelector('[data-yes]').addEventListener('click',()=>{ cleanup(); resolve(true); });
      box.querySelector('[data-cancel]').addEventListener('click',()=>{ cleanup(); resolve(false); });
    });
  }
  adminCategoriesList.addEventListener('click',async e=>{
    const btn=e.target.closest('button[data-delete-cat]'); if(!btn) return;
    const cat=btn.getAttribute('data-delete-cat'); if(cat==='uncategorized') return;
    const ok=await confirmDialog(`Are you sure you want to delete category "${cat}"?\nPosts in this category will move to Uncategorized.`);
    if(!ok) return;
    posts.forEach(p=>{ if((p.cat||p.category)==='${cat}') p.cat='uncategorized'; });
    categories=categories.filter(c=>c!==cat);
    localStorage.setItem('saffron_categories',JSON.stringify(categories));
    localStorage.setItem('saffron_posts',JSON.stringify(posts));
    renderAdminCategories(); renderList(); renderLatest();
    });

  // Admin: publish post
  document.getElementById('newPostForm').addEventListener('submit',e=>{
    e.preventDefault();
    const title=document.getElementById('adminTitle').value.trim();
    const excerpt=document.getElementById('adminExcerpt').value.trim();
    const author=document.getElementById('adminAuthor').value.trim();
    const time=document.getElementById('adminTime').value.trim();
    const img=(document.getElementById('adminImage').value.trim()||'assets/svg/sample-cover-1.svg');
    const cat=document.getElementById('adminCategorySelect').value;
    const content=document.getElementById('editorArea').innerHTML.trim();
    if(!title||!excerpt||!author||!time){alert('Please fill in all required fields.');return;}
    const id='p'+Date.now();
    posts.push({id,title,cat,excerpt,author,time,img,content});
    save(STORAGE.posts,posts);
    renderLatest();filterList();
    show('post');showPostById(id);location.hash='post';
    e.target.reset();document.getElementById('editorArea').innerHTML='';
    alert('Post published!');
  });

  // Admin: simple editor toolbar
  document.querySelectorAll('.editor-toolbar [data-cmd]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const cmd=btn.dataset.cmd;
      if(cmd==='createLink'){
        const url=prompt('Enter URL'); if(url) document.execCommand('createLink',false,url);
      }else{
        document.execCommand(cmd,false,null);
      }
    });
  });

  // Initial render
  renderCategoriesUI();
  renderLatest();
  renderList(posts);
  const sidebar=document.getElementById('sidebarList');
  sidebar.innerHTML='';posts.slice(0,4).forEach(p=>{const li=document.createElement('li');li.innerHTML=`<a href="#post" data-id="${p.id}">${p.title}</a>`;sidebar.appendChild(li);});

  // Live update when admin modifies posts in another tab
  window.addEventListener('storage',e=>{
    if(e.key===STORAGE.posts){
      posts=load(STORAGE.posts,posts);
      renderLatest();
      filterList();
      const sList=document.getElementById('sidebarList');
      sList.innerHTML='';
      posts.slice(0,4).forEach(p=>{const li=document.createElement('li');li.innerHTML=`<a href="#post" data-id="${p.id}">${p.title}</a>`;sList.appendChild(li);});
    }
    if(e.key===STORAGE.categories){
      categories=load(STORAGE.categories,categories);
      renderCategoriesUI();
      filterList();
    }
  });
})();