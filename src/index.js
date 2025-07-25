import introJs from "intro.js";
import 'intro.js/introjs.css';
import '../styles/main.css';
import { fromUnixTime, format } from 'date-fns';
import { throwError } from "rxjs";
import * as XLSX from 'xlsx';

let globalToken = null; 
let postalCodesFromExcel = []

introJs().start();
introJs(".generateTokenBtn").start();



//epochConverter
function epochConverter(epochSeconds) {
   const date = fromUnixTime(epochSeconds);
   return format(date, 'dd-MMM-yyyy HH:mm:ss');
}

//solve api fail: 
async function retryFetch(url, options = {}, retries = 3, delay = 1000) {
   for (let i = 0; i < retries; i++) {
      try {
         const res = await fetch(url, options);
         if (!res.ok) throw new Error(`Status: ${res.status}`);
         return res;
      } catch (err) {
         if (i === retries - 1) throw err;
         console.warn(`🔁 Retry ${i + 1}/${retries} for ${url}`);
         await new Promise(resolve => setTimeout(resolve, delay));
      }
   }
}




const getTokenBtn = document.getElementById("getTokenBtn");
getTokenBtn.addEventListener('click', getToken);
//getTokenFunc
async function getToken() {
   const successMsg = document.getElementsByClassName('successToken')[0];

   try {
      const response = await fetch('https://distance-checker-05qx.onrender.com/get-token');
      if (!response.ok) throw new Error(`⚠️ HTTP Err! sts: ${response.status}`);

      const data = await response.json();

      // Save token for use in other functions
      globalToken = data.access_token;
      localStorage.setItem('oneMapToken', globalToken)

      const tokenExpiryDate = epochConverter(data.expiry_timestamp);

      successMsg.innerText = `✅ Token saved. It will expire on: ${tokenExpiryDate}`;
      // successMsg.innerText = "✅ Token saved.";

   } catch (error) {
      console.error('❌ Error getting token:', error);
   }
}

//readExcelFunc
document.getElementById('excelUpload').addEventListener('change', handleFile, false)

function handleFile(e){
   const file = e.target.files[0];
   const reader = new FileReader();

   reader.onload = function(event){
      const data = new Uint8Array(event.target.result)
      const workbook = XLSX.read(data,{type:'array'})
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet]; 

      const jsonData = XLSX.utils.sheet_to_json(worksheet,{defval: ''})

      postalCodesFromExcel = jsonData.map(row => row.postal_code).filter(pc=>pc);
      document.querySelector('.uploadMessage').innerText = `✅${postalCodesFromExcel.length} postal codes loaded`
      console.log('postalCodesFromExcel :>> ', postalCodesFromExcel);

   }
   reader.readAsArrayBuffer(file)
}


//get each postal code coordinates
async function getCoordinates(postalCode) {
   const res = await retryFetch(`https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postalCode}&returnGeom=Y&getAddrDetails=Y`);
   const data = await res.json();
   const first = data.results?.[0];
   if (!first || !first.LATITUDE || !first.LONGITUDE) {
      console.warn(`⚠️ Invalid or missing coordinates for postal code: ${postalCode}`);
      throw new Error(`Postal code not found: ${postalCode}`);
   }
   return {
      lat: parseFloat(first.LATITUDE),
      lng: parseFloat(first.LONGITUDE),
   };
}

//get current time date
function getCurrentDateTimeForOneMap() {
   const now = new Date();
   const pad = (n) => n.toString().padStart(2, '0');
   const date = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${now.getFullYear()}`;
   const time = encodeURIComponent(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
   return { date, time };
}


const localStorageToken = localStorage.getItem('oneMapToken');
//Calculate Transit Distance
async function getDistance(startLat, startLng, endLat, endLng) {
   const { date, time } = getCurrentDateTimeForOneMap();

   const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${startLat},${startLng}&end=${endLat},${endLng}&routeType=pt&date=${date}&time=${time}&mode=TRANSIT&numItineraries`;


   try {
      const res = await retryFetch(url, {
         headers: {
            'Authorization': localStorageToken
         }
      });

      const data = await res.json();
      const itinerary = data.plan?.itineraries?.[0];
      // console.log('get dis itinerary :>> ', itinerary);
      if (!itinerary) return { duration: "No route", distance_km: "N/A", legs: [] };

      const durationMins = Math.round(itinerary.duration / 60);
      const totalDistanceM = itinerary.legs.reduce((sum, leg) => sum + (leg.distance || 0), 0);
      const totalDistanceKm = (totalDistanceM / 1000).toFixed(2);

      const legs = itinerary.legs.map(leg => ({
         mode: leg.mode,
         distance_km: (leg.distance / 1000).toFixed(2),
         duration_min: Math.round(leg.duration / 60)
      }));

      return {
         duration: `${durationMins} mins`,
         distance_km: totalDistanceKm,
         legs
      };
   } catch (err) {
      return { duration: "Error", distance_km: "Error", legs: [] };
   }
}

//calculate drive distance
async function getDrivingDistance(startLat, startLng, endLat, endLng) {
   const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${startLat},${startLng}&end=${endLat},${endLng}&routeType=drive`;

   try {
      const res = await retryFetch(url, {
         headers: {
            'Authorization': localStorageToken
         }
      });

      const data = await res.json();
      const route = data.route_summary;
      // console.log('driving route :>> ', route);
      if (!route) {
         return { duration: "No route", distance_km: "N/A", legs: [] };
      }

      const durationMins = Math.round(route.total_time / 60);
      const totalDistanceKm = (route.total_distance / 1000).toFixed(2);

      return {
         duration: `${durationMins} mins`,
         distance_km: totalDistanceKm,
      };
   } catch (err) {
      console.error("❌ Drive distance error:", err);
      return { duration: "Error", distance_km: "Error" };
   }
}


//Calculate Button
document.getElementById('calculateDistance').addEventListener('click', async () => {
   const targetPostalCode = document.getElementById('targetPostalCode').value;
   const outputDiv = document.getElementById('postalOutput');

   if (!globalToken) return alert("⚠️ Please generate token first.");
   if (!targetPostalCode || !/^\d{6}$/.test(targetPostalCode)) return alert("⚠️ Please enter a valid target postal code.");
   if (postalCodesFromExcel.length === 0) return alert("⚠️ Please upload an Excel file first.");

   outputDiv.innerHTML = `⏳ Calculating ${postalCodesFromExcel.length} routes...`;

   try {
      const targetCoords = await getCoordinates(targetPostalCode);
      const results = [];

      for (const fromPostal of postalCodesFromExcel) {
         try {
            const fromCoords = await getCoordinates(fromPostal);
            const transitResult = await getDistance(fromCoords.lat, fromCoords.lng, targetCoords.lat, targetCoords.lng);
            //console.log('transitResult :>> ', transitResult);
            const driveResult = await getDrivingDistance(fromCoords.lat, fromCoords.lng, targetCoords.lat, targetCoords.lng);
            console.log('driveResult :>> ', driveResult);
            results.push({
               from: fromPostal,
               to: targetPostalCode,
               transit_duration: transitResult.duration,
               transit_distance_km: transitResult.distance_km,
               drive_duration: driveResult.duration,
               drive_distance_km: driveResult.distance_km,
            });
            
         } catch (err) {
            results.push({ from: fromPostal, to: targetPostalCode, distance: "Error:"});
         }
      }
      ;
      displayResults(results);
      window.lastDistanceResults = results;
   } catch (err) {
      outputDiv.innerHTML = `<span style="color:red">❌ ${err.message}</span>`;
   }
});

//Display Results
function displayResults(data) {
   const outputDiv = document.getElementById('postalOutput');
   const table = document.createElement('table');
   table.border = '1';
   table.innerHTML = `
   <tr>
      <th>From</th>
      <th>To</th>
      <th>Transit Duration</th>
      <th>Transit Distance (km)</th>
      <th>Drive Duration</th>
      <th>Drive Distance (km)</th>
   </tr>
   ${data.map(row => `
      <tr>
         <td>${row.from}</td>
         <td>${row.to}</td>
         <td>${row.transit_duration}</td>
         <td>${row.transit_distance_km}</td>
         <td>${row.drive_duration}</td>
         <td>${row.drive_distance_km}</td>
      </tr>`).join('')}
   `;
   outputDiv.innerHTML = '';
   outputDiv.appendChild(table);
}

//Export as Excel
document.getElementById('export').addEventListener('click', () => {
   if (!window.lastDistanceResults || window.lastDistanceResults.length === 0) {
      alert("⚠️ No data to export.");
      return;
   }

   const worksheet = XLSX.utils.json_to_sheet(window.lastDistanceResults);
   const workbook = XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(workbook, worksheet, "Distance Results");
   XLSX.writeFile(workbook, "distance_results.xlsx");
});