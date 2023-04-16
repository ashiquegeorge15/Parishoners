
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDyqAiultYZzwcoRfQhNKRiCG3DuEBEsd8",
  authDomain: "backendlogsign.firebaseapp.com",
  databaseURL: "https://backendlogsign-default-rtdb.firebaseio.com",
  projectId: "backendlogsign",
  storageBucket: "backendlogsign.appspot.com",
  messagingSenderId: "1039275246750",
  appId: "1:1039275246750:web:ee61d0b254a2697a3e278f",
  measurementId: "G-C9R69XEVH7"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

import { getDatabase, ref, set,get, update, remove,child,push, onChildAdded, onChildChanged, onChildRemoved, onValue,orderByChild } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-database.js";

//******************************** */ INSERT ANNOUNCEMENT

//POST Announcement------------------------------------ADMIN ONLY
const db=getDatabase();
const postListRef = ref(db, 'events/');
const newPostRef = push(postListRef);

var listItem

const btn=document.querySelector("#postBtn");

const annTitle=document.querySelector('#annTitle');
const annBody=document.querySelector('#annBody');

                      //Date and Time

let today=new Date();
const dd=String( today.getDate()).padStart(2,'0');
const mm=String( today.getMonth()+1).padStart(2,'0');
const yy= today.getFullYear();
let hh= String(today.getHours()).padStart(2,'0');
let mi= String(today.getMinutes()).padStart(2,'0');

// console.log(hh);
if(hh>12){
  if(mi>=0){
    console.log()
    hh=hh-12;
    if(hh<10)
    hh="0"+hh;
    mi=mi+"pm";
    // console.log(hh);
    // Time=hh+":"+mi;
  }
 }else{
  mi= mi+"am";
  // Time=hh+":"+mi;
 }
const date=`${dd}/${mm}/${yy}`;
const time=`${hh}:${mi}`;

//console.log(date+" "+time);

function insert(){
  if(annTitle.value==""||annBody.value==""){
    document.querySelector('#annTitle').placeholder="Insert Title Please!";
    document.querySelector('#annBody').placeholder="Insert contentDiv Please!";
  }

  else{
set(newPostRef, {
  Title: annTitle.value,
  Description: annBody.value,
  Date: date,
  Time: time
  }).then(()=>{
  alert("Event posted!");
  window.location.reload();
  }).catch((error)=>{
  alert(error);
  });}
}

btn.addEventListener('click',insert);



//DISPLAY Anouncements

const dbref=ref(db);
function test()
{
  const db = getDatabase();
const dbRef = ref(db, 'events');
const auth = getAuth();

const myList=document.getElementById("myList");

// var DD=0;
// var MM=0;
// var YY=0;
// var HH=0;
// var MI=0;

// function low(dd,mm,yy,hh,mi){
//   myList.appendChild(listItem);
//   DD=dd;
//   MM=mm;
//   YY=yy;
//   HH=hh;
//   MI=mi;
// }
// function high(dd,mm,yy,hh,mi,listItem){
//   myList.insertBefore(listItem, myList.children[0]);
//   DD=dd;
//   MM=mm;
//   YY=yy;
//   HH=hh;
//   MI=mi;
// }

var i=1;//-----------------Test variable
//code for SORTING records (Firebase) **** Didn't work
// const myUserId = auth.currentUser.uid;
// const topUserPostsRef = query(ref(db, 'Announcements/' + myUserId), orderByChild('date'));



//******************************************************************************************
//-------------------------- Getting Values from Firebase ------------------
//*******************************************************************************************



onValue(dbRef, (snapshot) => {
  snapshot.forEach((childSnapshot) => {
    const childKey = childSnapshot.key;
    const Title = childSnapshot.val().Title;
    const Body = childSnapshot.val().Description;
    const Date = childSnapshot.val().Date;
    let Time = childSnapshot.val().Time;
  //  console.log(childKey);


    let dd=Date.slice(0, 2);
    let mm=Date.slice(3,5);
    let yy=Date.slice(6,10);
    let hh=Time.slice(0,2);
    let mi=Time.slice(3,5);

    // if(hh>12){
    //   if(mi>0){
    //     hh=hh-12;
    //     mi=mi+" PM";
    //     Time=hh+":"+mi;
    //   }
    //  }else{
    //   mi= mi+" AM";
    //   Time=hh+":"+mi;
    //  }

    // console.log("day "+dd);
    // console.log("month "+mm);
    // console.log("year "+yy);
    // console.log("hour "+hh);
    // console.log("min "+mi);

  
    // console.log(Title);
    // console.log(Body);
    // console.log();

    //CREATE NODE
    // Get a reference to the empty <ul> element
var myList = document.getElementById("myList");

// console.log(myList.childNodes.length-11+" "+i);
// i=i+1;

// Create a new <li> element
listItem = document.createElement("li");
listItem.classList.add("announcementslist");
//listItem.id=childKey;
// Create a new <div> element
var innerDiv = document.createElement("div");
innerDiv.classList.add("container");

// Create div and p for title
var titleDiv=document.createElement("div");
  // Set the class of the <div> element to "titleDiv"
titleDiv.classList.add("title");
var titleP=document.createElement("p");


// Create div for delete button
// var titleDelDiv=document.createElement("div");
  // Set class of div to "dropdown"
  // titleDelDiv.classList.add("dropdown");
//Create delete button
var delBtn=document.createElement("input");
  // Set class of button to "dropdown-item"
  delBtn.classList.add("deletebtn");
  // delBtn.innerHTML="Delete";
  delBtn.type="button";
  delBtn.value="Delete";
  delBtn.id=childKey;

  // delBtn.classList.add("btn btn-primary btn-sm");
  //delBtn.onclick="delAnn(childKey)";
  
  
  
// Create div and p for content
var contentDiv=document.createElement("div");
  // Set the class of the <div> element to "titleDiv"
contentDiv.classList.add("content");
var contentP=document.createElement("p");

// Create div and p for date and time
var dtDiv=document.createElement("div");
  // Set the class of the <div> element to "titleDiv"
dtDiv.classList.add("comment");
var dtP=document.createElement("p");


// Append the title Div element to the inner Div element

innerDiv.appendChild(titleDiv);
  titleDiv.appendChild(titleP);
  titleDiv.appendChild(delBtn);

  // Call delete function on click of button
  delBtn.addEventListener('click', function() {
    //this.parentElement.remove();
    // console.log("DELETE called");
    alert("You sure to delete "+Title+"?");
    const del=remove(ref(db, 'events/'+this.id));
    // alert(del);
    window.location.reload();
  })
  // titleDelDiv.appendChild(delBtn);
  titleP.textContent=Title;

// Append the content Div element to the inner Div element

innerDiv.appendChild(contentDiv);
  contentDiv.appendChild(contentP);
  contentP.textContent=Body;

// Append the title Div element to the inner Div element

  innerDiv.appendChild(dtDiv);
  dtDiv.appendChild(dtP);
  dtP.textContent=Date+" "+Time;

// Append the inner<div> element to the <li> element
listItem.appendChild(innerDiv);

//append latest event to list
myList.appendChild(listItem);

//SORT ACCORDING TO DATE AND TIME   *****------------------------- SORT

// if(myList.childNodes.length-11==0)//---- There are some extra 11 characters in length
// {
// // Append the <li> element to the <ul> element
// myList.appendChild(listItem);
// DD=dd;
// MM=mm;
// YY=yy;
// HH=hh;
// MI=mi;
// // console.log(DD);
// // console.log(MM);
// // console.log(YY);
// // console.log(HH);
// // console.log(MI);

// }

// else
// {if(yy>YY){
//     high(dd,mm,yy,hh,mi,listItem);
//   }else if(yy==YY){if(mm>MM){
//     high(dd,mm,yy,hh,mi,listItem);
//     }else if(mm==MM){if(dd>DD){
//       high(dd,mm,yy,hh,mi,listItem);
//       }else if(dd==DD)
//       {if(hh>HH){
//         high(dd,mm,yy,hh,mi,listItem);
//         }else if(hh==HH){if(mi>=MI){
//           high(dd,mm,yy,hh,mi,listItem);
//           }else{
//             low(dd,mm,yy,hh,mi);
//           }
//         }else{
//           low(dd,mm,yy,hh,mi);
//         }
//       }else{
//         low(dd,mm,yy,hh,mi);
//       }
//     }else{
//       low(dd,mm,yy,hh,mi);
//     }
//   }else
//   {

//   }
// }

// console.log(listItem);
  });
}, {
  onlyOnce: true
});
}

 window.onload=test();




