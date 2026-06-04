Torniamo alla creazione automatica della degustazione.

Il flusso deve usare OpenAI Vision per analizzare la foto della bottiglia, fare match sul catalogo
e recuperare i dati utili per il quiz.

Google Vision non deve piu comparire nella pipeline runtime.

Il catalogo al momento è vuoto, quindi la feature deve funzionare in modo progressivo: prima estrae
i dati dalla foto, poi prova il match sul catalogo / OpenAi, poi permette conferma/correzione
manuale, e infine genera il quiz ( con i dati di tutte le bottiglie per le risposte sbagliate).

OpenAI deve fare due cose:

1. Analizzare la foto della bottiglia o dell’etichetta.
2. Restituire dati strutturati del vino.

Prompt da usare per OpenAI:

"Analizza questa foto di una bottiglia di vino o della sua etichetta. Estrai solo le informazioni
visibili o altamente probabili. Non inventare dati. Se un dato non è leggibile, usa null. Rispondi
esclusivamente in JSON valido secondo lo schema richiesto.

Dopo la risposta OpenAI:

- usare i dati per arricchire il catalogo
- se la confidence di OpenAI o la confidence del match è bassa, mostrare conferma manuale
- non pubblicare automaticamente se il match è incerto

Flusso UX:

1. L’utente scatta o carica la foto della bottiglia.
2. Il sistema analizza la foto con OpenAI Vision.
3. Il sistema mostra il risultato trovato o una bozza dei dati estratti.
4. L’utente conferma o corregge.
5. Il vino confermato viene aggiunto alla degustazione corrente.
6. L’utente ripete il processo per le altre bottiglie.
7. Quando tutti i vini sono stati confermati, l’utente clicca “Genera quiz”.
8. Il sistema genera il quiz usando solo i vini confermati.

Se un vino non esiste ancora nel catalogo, il quiz può usare i dati confermati manualmente
dall’utente, ma deve evitare di inventare informazioni non disponibili. Il quiz deve essere
modificabile prima del salvataggio definitivo.

Obiettivo finale:

Foto bottiglia → analisi OpenAI Vision → match catalogo/database → conferma manuale → aggiunta alla
degustazione → generazione quiz automatico → revisione e salvataggio.
