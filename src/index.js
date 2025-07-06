import introJs from "intro.js";
import 'intro.js/introjs.css';
import '../styles/main.css';
import { fromUnixTime, format } from 'date-fns';
import { throwError } from "rxjs";

let globalToken = null; 

function epochConverter(epochSeconds) {
   const date = fromUnixTime(epochSeconds);
   return format(date, 'dd-MMM-yyyy HH:mm:ss');
}

const getTokenBtn = document.getElementById("getTokenBtn");
getTokenBtn.addEventListener('click', getToken);

async function getToken() {
   const successMsg = document.getElementsByClassName('successToken')[0];

   try {
      const response = await fetch('http://localhost:3001/get-token');
      if (!response.ok) throw new Error(`⚠️ HTTP Err! sts: ${response.status}`);

      const data = await response.json();

      // Save token for use in other functions
      globalToken = data.access_token;

      const tokenExpiryDate = epochConverter(data.expiry_timestamp);

      successMsg.innerText = `✅ Token saved. It will expire on: ${tokenExpiryDate}`;

   } catch (error) {
      console.error('❌ Error getting token:', error);
   }
}
