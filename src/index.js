import introJs from "intro.js";
import 'intro.js/introjs.css';
import { fromUnixTime, format } from 'date-fns';
import { throwError } from "rxjs";

// introJs().start();
// introJs().addHints();
// introJs(".first-step").start();

function epochConverter(epochSeconds) {
   const date = fromUnixTime(epochSeconds);
   return format(date, 'dd-MMM-yyyy HH:mm:ss');
}

const getTokenBtn = document.getElementById("getTokenBtn")
getTokenBtn.addEventListener('click',getToken)
async function getToken(){
   const url = "https://www.onemap.gov.sg/api/auth/post/getToken"
   const data = JSON.stringify({
      email: "kimberlee1811@gmail.com",
      password: "work@ICR!*!!"
   })
   const successMsg = document.getElementsByClassName('successToken')[0];

   fetch(url,{
      method:"POST",
      headers:{
         "Content-Type":"application/json"
      },
      body:data,
   })
      .then(response=>{
         if(!response.ok){
            throw new Error (`⚠️HTTP Err! sts: ${response.status}`)
         }
         return response.json()
      })
      .then(data=>{
         console.log('data :>> ', data)
         const tokenExpiryDate = epochConverter(data.expiry_timestamp)
         console.log('tokenExpiryDate :>> ', tokenExpiryDate);
         successMsg.innerText = "Token and saved. Your usage will expires on: " + tokenExpiryDate + " please generate the token again after " + tokenExpiryDate;
      })
      .catch(error=>{
         console.log('error :>> ', error);
      })

      
}

//eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo3NzkxLCJmb3JldmVyIjpmYWxzZSwiaXNzIjoiT25lTWFwIiwiaWF0IjoxNzUxNzkxMDYwLCJuYmYiOjE3NTE3OTEwNjAsImV4cCI6MTc1MjA1MDI2MCwianRpIjoiNWZhNDFhNTEtN2M5Ni00OWEyLWJjMDQtODJmMGI5ZTk5YzkzIn0.WuAqnaZWcO3SrINlOO0eKBxslb02VSD7meQtOPBt-kF1gInW1U7-soQCgORiVrHdyfm8YujJmUnqR8Pleo4gNNhFJepGjAV31KnTzDv1pMCIj-NZO197J03M3MSG-NlxcKrrgXcuF-bFbUAibuiEsgQs0zEu4xE_4uQqwNQVnv0RappjI6nkdWhMur-kXKyroAlHiWmzxTQV9uZ_HTZ1Tq7StPb0Pl4EFSwDfsYAyeC6Idh2X8UEaQYoQqq2JRTh5a1a6RqOqer4v_1ybar1OtkaNsVQupgUaz-I7H2D9atvt0CyHms4wjdO6GUXygEZZF0ppDY9cDUIkb3KDkbfGQ
