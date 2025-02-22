const burger=document.querySelector('.burger')
const topoptions=document.querySelector('.TopOptions')
const off=document.querySelector('.off')
const topbar=document.querySelector('.TopBar')
const center=document.querySelector('.center')
const form=document.querySelector('.form')


burger.addEventListener('click',show);
//off.addEventListener('click',close);

function show(){
    burger.addEventListener('click',()=>{
        // topoptions.classList.toggle('vclass');
        topbar.classList.toggle('vclass');
        center.classList.toggle('vclass');
        topoptions.classList.toggle('h-nav');
        topoptions.classList.toggle('h-nav-d');
        // burger.classList.toggle('vclass');
        form.classList.toggle('vclass');
    })
}

function close(){
    off.addEventListener('click',()=>{
        // topbar.classList.toggle('vclass');
        // center.classList.toggle('vclass');
        // topbar.classList.toggle('vclass');
        // center.classList.toggle('vclass');
        // topoptions.classList.toggle('h-nav');
        // off.classList.toggle('vclass');

    })
}





