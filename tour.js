// Exterior camera path. Dimensions are inferred from the source perspectives.
export const STOPS = [
 {t:0,p:[-62,112,140],look:[0,2,-2]},
 {t:.075,p:[-38,42,88],look:[4,5,-2]},
 {t:.13,p:[-4,9,88],look:[4,6,1]},
 {t:.19,p:[-73,9,56],look:[-17,7,0]},
 {t:.23,p:[-73,4,33],look:[-20,6,4]},
 {t:.275,p:[-58,2.7,28],look:[-23,7,6]},
 {t:.315,p:[-46,3,11],look:[-25,7,0]},
 {t:.34,p:[-46,3,5.5],look:[-12,7,6]},
 {t:.37,p:[-10.5,3,5.5],look:[10,5,-4]},
 {t:.395,p:[-10.5,2.1,15.5],look:[10,6,-10]},
 {t:.445,p:[3,2.1,15.5],look:[10,5,-5]},
 {t:.50,p:[23,2.1,15.5],look:[10,8,-10]},
 {t:.54,p:[27.5,5,1],look:[10,10,-10]},
 {t:.575,p:[27.5,4,-45],look:[20,8,-10]},
 {t:.625,p:[20,5,-61],look:[16,6,-13]},
 {t:.665,p:[-4,5,-63],look:[0,6,-12]},
 {t:.715,p:[61,7,-53],look:[44,7,-23]},
 {t:.75,p:[66,2.4,-34],look:[73,2,-26]},
 {t:.79,p:[78,2.4,-8],look:[70,2,-6]},
 {t:.835,p:[66,5,36.5],look:[45,8,21]},
 {t:.865,p:[28,7,57],look:[12,7,5]},
 {t:.9,p:[-25,24,75],look:[2,5,0]},
 {t:.94,p:[-70,58,102],look:[0,4,-3]},
 {t:1,p:[-62,112,140],look:[0,2,-2]}
];
export const CHAPTERS = [
 {t:0,label:'LA RÉSIDENCE',eyebrow:'UN NOUVEAU LIEU DE VIE À BÉJAÏA',title:'La vie,<br><em>côté jardin.</em>',description:'Les Oliviers. Cinq blocs autour d’un cœur paysager, dans une résidence de 6 000 m².',value:'6 000',unit:'M²',caption:'LA SUPERFICIE DU PROJET'},
 {t:.105,label:'L’ARRIVÉE',eyebrow:'L’ARCHITECTURE DES OLIVIERS',title:'Une adresse.<br><em>Un caractère.</em>',description:'Des façades claires, de grandes baies et des balcons qui rythment les cinq blocs de la résidence.',value:'05',unit:'BLOCS',caption:'UNE COMPOSITION AUTOUR DES JARDINS'},
 {t:.21,label:'LE PARKING',eyebrow:'L’ACCÈS PAR LE CÔTÉ GAUCHE',title:'Arriver.<br><em>Se sentir chez soi.</em>',description:'Le stationnement paysager accompagne l’arrivée, à proximité des bâtiments et des cheminements piétons.',value:'À pied',unit:'LES ACCÈS',caption:'DU STATIONNEMENT AUX BÂTIMENTS'},
 {t:.335,label:'LE CŒUR PAYSAGER',eyebrow:'ENTREZ DANS LA RÉSIDENCE',title:'La nature,<br><em>au centre.</em>',description:'Les allées se glissent entre les arbres et les massifs fleuris. La cour devient un lieu de passage, de rencontre et de respiration.',value:'01',unit:'CŒUR',caption:'UN JARDIN ENTRE LES CINQ BLOCS'},
 {t:.485,label:'LES BALCONS',eyebrow:'PRENEZ LE TEMPS DE REGARDER',title:'Ouvert<br><em>sur l’extérieur.</em>',description:'Au fil des façades, les balcons prolongent les appartements vers la cour et les jardins.',value:'Dehors',unit:'LES BALCONS',caption:'DES ESPACES OUVERTS SUR LE PROJET'},
 {t:.595,label:'L’ARRIÈRE',eyebrow:'LA RÉSIDENCE SOUS UN AUTRE ANGLE',title:'Le calme,<br><em>tout autour.</em>',description:'La promenade continue derrière les bâtiments, au milieu des jardins et des espaces extérieurs représentés sur le projet.',value:'Au vert',unit:'LES JARDINS',caption:'UN AUTRE REGARD SUR LES OLIVIERS'},
 {t:.72,label:'LA PROMENADE',eyebrow:'DES MOMENTS À PARTAGER',title:'Une pause.<br><em>À votre rythme.</em>',description:'Bancs, cheminements et aire de jeux ponctuent les jardins. Des lieux pour se retrouver au fil de la journée.',value:'Ensemble',unit:'LES EXTÉRIEURS',caption:'PROMENADE ET ESPACES DE RENCONTRE'},
 {t:.865,label:'BÉJAÏA',eyebrow:'VOTRE VILLE, VOS HORIZONS',title:'Bien ici.<br><em>Connecté ailleurs.</em>',description:'À Béjaïa, à proximité de l’aéroport Abane Ramdane et avec accès à l’autoroute Est-Ouest.',value:'Béjaïa',unit:'ALGÉRIE',caption:'LA RÉSIDENCE LES OLIVIERS'},
 {t:.955,label:'UN DERNIER REGARD',eyebrow:'VOTRE PROCHAIN CHAPITRE',title:'Les Oliviers.<br><em>Et vous.</em>',description:'Poursuivez le défilement pour retrouver les caractéristiques du projet, son cadre de vie et sa situation.',value:'6 000',unit:'M²',caption:'UN NOUVEAU LIEU DE VIE'}
];
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export function sampleTour(progress){
 const p=clamp(progress);let i=0;
 while(i<STOPS.length-2&&p>STOPS[i+1].t)i++;
 const a=STOPS[i],b=STOPS[i+1];let t=clamp((p-a.t)/(b.t-a.t));t=t*t*(3-2*t);
 return {p:a.p.map((v,k)=>v+(b.p[k]-v)*t),look:a.look.map((v,k)=>v+(b.look[k]-v)*t),index:i};
}
