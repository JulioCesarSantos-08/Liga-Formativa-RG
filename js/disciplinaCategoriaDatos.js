import {collection,getDocsFromServer} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {db} from "./firebase.js";
export async function cargarHistorialDisciplina() {
    const snapshot=await getDocsFromServer(collection(db,"cedulas"));
    return snapshot.docs.map(s=>({...s.data(),id:s.id}));
}
