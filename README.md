# TEJPBIL Koden

Hej Håkan här finns instruktioner på hur man bygger webbsidan för tejpbilen

## För att bygga programmet

### Sätt in rätt api nyckel

skapa filen `apikey.ts` i mappen `web/src`. Du ska alltså skapa `web/src/apikey.ts` filen. I denna fil ska innehållet vara följande

```ts
export default "DIN TEACHGPT NYCKE";
```

ersätt DIN TEACHGPT NYCKEL med din api nyckel till teachgpt.

### Installera npm och python

Pakiteringen av hemsidan behöver npm och python installerat på datorn för att kunna fullföljas.

### Pakitera webbsidan in i en header fil

För att pakitera hemsidan finns det ett byggscript som heter `build.py` för att köra scriptet ska du öppna ett terminalfönster i projektets mapp.
På Windows kör

```bash
python build.py
```

På linux kör

```bash
python3 build.py
```

### Färdig

nu borde en index.h fil ha skapats som behöver användas för att kompilera c koden till arduinon. Lösenordet för att komma in på hemsidan för arduinon är "tejpbil123".
