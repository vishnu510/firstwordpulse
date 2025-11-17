// Saffron Admin - client-side auth + dashboard
(function(){
  const STORAGE={posts:'saffron_posts',categories:'saffron_categories',auth:'saffron_auth',session:'saffron_session'};
  const load=(k,f)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):f;}catch(e){return f;}};
  const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){alert('Failed to save data. Local storage may be full. Please delete old posts or use smaller images.');return false;}}

  // Crypto helpers (SHA-256 using SubtleCrypto)
  async function sha256(text){
    const enc=new TextEncoder().encode(text);
    const buf=await crypto.subtle.digest('SHA-256',enc);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  function randHex(n){return Array.from(crypto.getRandomValues(new Uint8Array(n))).map(b=>b.toString(16).padStart(2,'0')).join('');}
  // Compress image to a reasonable size before storing in localStorage
  async function compressImage(file,{maxW=1200,maxH=1200,quality=0.75}={}){
    const bitmap=await createImageBitmap(file);
    const ratio=Math.min(maxW/bitmap.width,maxH/bitmap.height,1);
    const w=Math.max(1,Math.round(bitmap.width*ratio));
    const h=Math.max(1,Math.round(bitmap.height*ratio));
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,w,h);
    return canvas.toDataURL('image/jpeg',quality);
  }

  // Elements
  const setupView=document.getElementById('setupView');
  const loginView=document.getElementById('loginView');
  const adminApp=document.getElementById('adminApp');
  const logoutBtn=document.getElementById('logoutBtn');
  const recoveryView=document.getElementById('recoveryView');
  const forgotLink=document.getElementById('forgotLink');
  const revealIdBtn=document.getElementById('revealIdBtn');

  // First-run: show setup if no auth
  const auth=load(STORAGE.auth,null);
  const session=load(STORAGE.session,null);
  async function showState(){
    // Ensure all views hidden first
    if(setupView) setupView.hidden=true;
    if(loginView) loginView.hidden=true;
    if(recoveryView) recoveryView.hidden=true;
    if(adminApp) adminApp.style.display='none';
    // Reload latest auth/session each time
    const a=load(STORAGE.auth,null);
    const s=load(STORAGE.session,null);
    // Decide which to show
    if(!a){ if(setupView) setupView.hidden=false; }
    else if(s && s.user===a.user){ if(adminApp) adminApp.style.display='grid'; renderAll(); }
    else { if(loginView) loginView.hidden=false; }
  }

  // Setup credentials
  document.getElementById('setupForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const user=document.getElementById('setupUser').value.trim();
    const p1=document.getElementById('setupPass').value;
    const p2=document.getElementById('setupPass2').value;
    const recovery=(document.getElementById('setupRecovery')?.value||'').trim();
    if(!user||!p1||!p2||!recovery){alert('Fill all fields');return;}
    if(p1!==p2){alert('Passwords do not match');return;}
    const salt=randHex(16);
    const hash=await sha256(user+':'+p1+':'+salt);
    save(STORAGE.auth,{user,salt,hash,recovery});
    alert('Admin credentials saved. Keep your recovery code safe. Please login.');
    await showState();
  });

  // Login
  document.getElementById('loginForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const user=document.getElementById('loginUser').value.trim();
    const pass=document.getElementById('loginPass').value;
    const a=load(STORAGE.auth,null);
    if(!a){alert('No admin configured.');await showState();return;}
    const hash=await sha256(user+':'+pass+':'+a.salt);
    if(user===a.user && hash===a.hash){
      save(STORAGE.session,{user,ts:Date.now()});
      adminApp.style.display='grid';
      loginView.hidden=true;
      renderAll();
    }else{alert('Invalid credentials');}
  });

  // Logout
  logoutBtn.addEventListener('click',()=>{localStorage.removeItem(STORAGE.session);showState();});

  // Shared storage for posts and categories
  let categories=load(STORAGE.categories,['design','development','product','culture','uncategorized']);
  let posts=load(STORAGE.posts,[
    {id:'p1',title:'Whitespace in practice',cat:'design',excerpt:'How to use space to guide attention.',author:'Alex Lee',time:'6 min',img:'assets/svg/sample-cover-1.svg',content:'<p>Whitespace guides focus, improves comprehension, and brings calm to long-form content.</p><h2>Practical tips</h2><ul><li>Increase line-height</li><li>Limit line length</li><li>Use generous spacing</li></ul>'}
  ]);
  // Track editing state for Write form updates
  let currentEditId=null;

  // Tabs
  document.querySelectorAll('.admin-nav a').forEach(a=>{
    a.addEventListener('click',e=>{
      e.preventDefault();
      const tab=a.dataset.tab;
      document.querySelectorAll('.admin-nav a').forEach(x=>x.classList.toggle('active',x===a));
      document.querySelectorAll('.admin-content > section').forEach(sec=>sec.hidden=!sec.id.endsWith(tab));
    });
  });

  // Editor toolbar
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

  // Populate categories select
  function renderCats(){
    const sel=document.getElementById('postCategory');
    sel.innerHTML='';
    categories.forEach(cat=>{const o=document.createElement('option');o.value=cat;o.textContent=cat.charAt(0).toUpperCase()+cat.slice(1);sel.appendChild(o);});
    // List
    const list=document.getElementById('catsList');
    list.innerHTML='';
    categories.forEach(cat=>{
      const li=document.createElement('li');
      li.innerHTML=`<span>${cat.charAt(0).toUpperCase()+cat.slice(1)}</span> <button class="danger-btn" data-delete-cat="${cat}" ${cat==='uncategorized'?'disabled':''}>Delete</button>`;
      list.appendChild(li);
    });
  }

  // Add category
  document.getElementById('addCatBtn').addEventListener('click',()=>{
    const input=document.getElementById('newCatInput');
    const name=input.value.trim().toLowerCase();
    if(!name)return; if(name==='all'){alert('Cannot use "All"');return;}
    if(categories.includes(name)){alert('Category exists');return;}
    categories.push(name); save(STORAGE.categories,categories); renderCats(); input.value='';
  });

  // Delete category
  document.getElementById('tab-categories').addEventListener('click',e=>{
    const btn=e.target.closest('button[data-delete-cat]'); if(!btn)return; const cat=btn.getAttribute('data-delete-cat');
    if(cat==='uncategorized')return;
    if(!confirm(`Are you sure you want to delete category "${cat}"?\nPosts in this category will move to Uncategorized.`)) return;
    posts.forEach(p=>{if(p.cat===cat)p.cat='uncategorized';});
    categories=categories.filter(c=>c!==cat);
    save(STORAGE.categories,categories); save(STORAGE.posts,posts);
    renderCats(); renderPosts(); alert(`Deleted category "${cat}"`);
  });

  // Publish or update post
  document.getElementById('postForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const title=document.getElementById('postTitle').value.trim();
    const excerpt=document.getElementById('postExcerpt').value.trim();
    const author=document.getElementById('postAuthor').value.trim();
    const time=document.getElementById('postTime').value.trim();
    const cat=document.getElementById('postCategory').value;
    const content=document.getElementById('postContent').innerHTML.trim();
    const file=document.getElementById('postImageFile')?.files?.[0]||null;
    if(!title||!excerpt||!author||!time){alert('Please fill in all required fields.');return;}

    // If editing existing
    if(currentEditId){
      const existing=posts.find(p=>p.id===currentEditId);
      if(!existing){ alert('Original post not found.'); currentEditId=null; return; }
      let imgData=existing.img||existing.image||'assets/svg/sample-cover-1.svg';
      if(file){ try{ imgData=await compressImage(file,{maxW:1280,maxH:1280,quality:0.75}); }catch(err){ console.warn('Image processing failed',err); }}
      Object.assign(existing,{title,excerpt,author,time,readTime:time,cat,category:cat,img:imgData,image:imgData,content});
      if(!save(STORAGE.posts,posts)){ alert('Could not save changes due to storage limits. Try with a smaller image.'); return; }
      // Reset form and state
      document.getElementById('postForm').reset();
      document.getElementById('postContent').innerHTML='';
      const submitBtn=document.querySelector('#postForm .actions .cta'); if(submitBtn) submitBtn.textContent='Publish';
      currentEditId=null;
      renderPosts();
      alert('Post updated!');
      return;
    }

    // Otherwise publish new
    let imgData='assets/svg/sample-cover-1.svg';
    if(file){ try{ imgData=await compressImage(file,{maxW:1280,maxH:1280,quality:0.75}); }catch(err){ console.warn('Image processing failed',err); imgData='assets/svg/sample-cover-1.svg'; }}
    const id='p'+Date.now();
    const post={id,title,cat,category:cat,excerpt,author,time,readTime:time,img:imgData,image:imgData,content};
    posts.push(post);
    if(!save(STORAGE.posts,posts)){ // revert push if failed
      posts=posts.filter(p=>p.id!==id);
      alert('Could not save the post due to storage limits. Try with a smaller image.');
      return;
    }
    document.getElementById('postForm').reset();
    document.getElementById('postContent').innerHTML='';
    renderPosts(); alert('Post published!');
  });

  // Render posts table
  function renderPosts(){
    const tbody=document.querySelector('#postsTable tbody');
    tbody.innerHTML='';
    posts.slice().reverse().forEach(p=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${p.title}</td><td>${p.cat||p.category||'uncategorized'}</td><td>${p.author||''}</td><td>${p.time||p.readTime||''}</td><td><button class="icon-btn edit-post" data-id="${p.id}">Edit</button> <a class="icon-btn" href="index.html#post-${p.id}" data-id="${p.id}">Open</a> <button class="danger-btn delete-post" data-id="${p.id}">Delete</button></td>`;
      tbody.appendChild(tr);
    });
  }

  // Custom confirmation modal with Yes/Cancel for admin page
  function confirmDialog(message){
    return new Promise(resolve=>{
      const overlay=document.createElement('div'); overlay.className='confirm-overlay';
      const box=document.createElement('div'); box.className='confirm-box';
      box.innerHTML=`<p class="confirm-message">${message.replace(/\n/g,'<br>')}</p><div class="confirm-actions"><button class="danger-btn" data-yes>Yes</button><button class="cancel-btn" data-cancel>Cancel</button></div>`;
      overlay.appendChild(box); document.body.appendChild(overlay);
      const cleanup=()=>{overlay.remove();};
      overlay.addEventListener('click',e=>{ if(e.target===overlay) { cleanup(); resolve(false); } });
      box.querySelector('[data-yes]').addEventListener('click',()=>{ cleanup(); resolve(true); });
      box.querySelector('[data-cancel]').addEventListener('click',()=>{ cleanup(); resolve(false); });
    });
  }
  // Posts actions (open/delete)
  document.getElementById('postsTable').addEventListener('click',async e=>{
    const edit=e.target.closest('button.edit-post');
    const del=e.target.closest('button.delete-post');
    const open=e.target.closest('a.icon-btn[data-id]');
    if(open){ e.preventDefault(); const id=open.getAttribute('data-id'); window.location.href=`index.html#post-${id}`; }
    if(edit){
      const id=edit.getAttribute('data-id');
      const p=posts.find(x=>x.id===id); if(!p) return;
      // Prefill Write form
      document.getElementById('postTitle').value=p.title||'';
      document.getElementById('postExcerpt').value=p.excerpt||'';
      document.getElementById('postAuthor').value=p.author||'';
      document.getElementById('postTime').value=p.time||p.readTime||'';
      const sel=document.getElementById('postCategory'); sel.value=p.cat||p.category||'uncategorized';
      document.getElementById('postContent').innerHTML=p.content||`<p>${p.excerpt||''}</p>`;
      // Switch to Write tab
      document.querySelector('.admin-nav a[data-tab="write"]')?.click();
      // Update submit button label
      const submitBtn=document.querySelector('#postForm .actions .cta'); if(submitBtn) submitBtn.textContent='Update Post';
      currentEditId=id;
      document.getElementById('postTitle').focus();
      return;
    }
    if(del){ const id=del.getAttribute('data-id'); const ok=await confirmDialog('Are you sure you want to delete this post?'); if(!ok) return; posts=posts.filter(p=>p.id!==id); save(STORAGE.posts,posts); renderPosts(); }
  });

  function renderAll(){renderCats();renderPosts();}
  showState();
})();

// Settings: homepage hero
const HOME_SETTINGS_KEY = 'home_settings';
const homeSettingsForm = document.getElementById('homeSettingsForm');
const homeHeroTitle = document.getElementById('homeHeroTitle');
const homeHeroSub = document.getElementById('homeHeroSub');
const homeHeroAuthor = document.getElementById('homeHeroAuthor');
const homeHeroRead = document.getElementById('homeHeroRead');
const homeHeroCtaLabel = document.getElementById('homeHeroCtaLabel');
const homeHeroLinkPost = document.getElementById('homeHeroLinkPost');
const homeHeroImageFile = document.getElementById('homeHeroImageFile');
const homeHeroPreview = document.getElementById('homeHeroPreview');

function readHomeSettings() {
  try {
    const raw = localStorage.getItem(HOME_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeHomeSettings(data) {
  localStorage.setItem(HOME_SETTINGS_KEY, JSON.stringify(data));
}
function getStoredPosts(){
  try{ const raw=localStorage.getItem('saffron_posts'); return raw?JSON.parse(raw):[]; }catch{ return []; }
}
function populateHeroLinkOptions(selectedId){
  if(!homeHeroLinkPost) return;
  const posts=getStoredPosts();
  homeHeroLinkPost.innerHTML='';
  // Optional placeholder
  const ph=document.createElement('option'); ph.value=''; ph.textContent='Select a post to link'; homeHeroLinkPost.appendChild(ph);
  posts.forEach(p=>{ const opt=document.createElement('option'); opt.value=p.id; opt.textContent=p.title; homeHeroLinkPost.appendChild(opt); });
  if(selectedId){ homeHeroLinkPost.value=selectedId; }
}

function loadSettingsTab() {
  const s = readHomeSettings();
  homeHeroTitle.value = s?.title || '';
  homeHeroSub.value = s?.sub || '';
  homeHeroAuthor.value = s?.author || '';
  homeHeroRead.value = s?.read || '';
  homeHeroCtaLabel.value = s?.ctaLabel || '';
  populateHeroLinkOptions(s?.linkPostId || '');
  if (s?.imageDataUrl) {
    homeHeroPreview.src = s.imageDataUrl;
    homeHeroPreview.hidden = false;
  } else {
    homeHeroPreview.src = '';
    homeHeroPreview.hidden = true;
  }
}

if (homeSettingsForm) {
  loadSettingsTab();
  homeHeroImageFile?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      homeHeroPreview.src = reader.result;
      homeHeroPreview.hidden = false;
    };
    reader.readAsDataURL(file);
  });
  homeSettingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = homeHeroTitle.value.trim();
    const sub = homeHeroSub.value.trim();
    const author = homeHeroAuthor.value.trim();
    const read = homeHeroRead.value.trim();
    const ctaLabel = (homeHeroCtaLabel.value || 'Read Full Blog').trim();
    const linkPostId = homeHeroLinkPost?.value || '';
    const file = homeHeroImageFile.files?.[0];
    const prev = readHomeSettings()||{};
    const saveData = async (imageDataUrl) => {
      writeHomeSettings({
        title, sub, author, read, ctaLabel, linkPostId,
        imageDataUrl: imageDataUrl || prev.imageDataUrl || ''
      });
      alert('Homepage hero saved');
    };
    if (file) {
      const reader = new FileReader();
      reader.onload = () => saveData(reader.result);
      reader.readAsDataURL(file);
    } else {
      await saveData();
    }
  });
}

// Tab switching: include settings
const navLinks = document.querySelectorAll('.admin-nav a[data-tab]');
const tabs = {
  write: document.getElementById('tab-write'),
  posts: document.getElementById('tab-posts'),
  categories: document.getElementById('tab-categories'),
  settings: document.getElementById('tab-settings')
};
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const tab = link.dataset.tab;
    Object.values(tabs).forEach(sec => sec && (sec.hidden = true));
    navLinks.forEach(l => l.classList.remove('active'));
    if (tabs[tab]) tabs[tab].hidden = false;
    link.classList.add('active');
    if (tab === 'settings') loadSettingsTab();
  });
});