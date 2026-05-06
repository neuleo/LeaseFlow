### Projekt-Spezifikation: Dynamischer Leasing-Tracker

**1. Architektur & Tech-Stack**
* **Frontend:** Modernes Framework (React, Vue, Svelte) mit Tailwind CSS.
* **Design:** Mobile-First, responsiv für große Desktops, Dark-Mode Support.
* **Backend:** Node.js, Python oder Go.
* **Datenbank:** SQLite.
* **Graphen:** Chart.js, Recharts oder ApexCharts.

**2. Infrastruktur (Docker)**
* Vollständig containerisiert via `docker-compose.yml`.
* **Persistenz:** Zwingender lokaler Bind-Mount für die Datenbank.
* **Volume-Mapping:** `./data:/app/data` (Die SQLite-Datei muss im Code auf `/app/data/` referenziert werden).

**3. Kernfunktionen & UI**
* **Einstellungsmenü (dynamisch):** Konfiguration von Vertragsbeginn, Laufzeit, km-Budget/Jahr, Freigrenze und Parametern für den Arbeitsweg. 
* **Dateneingabe:** Schnelle Maske für "km-Stand" + "Datum" (aktualisiert bestehende Tageswerte, statt sie zu duplizieren).
* **Dashboard-Metriken:** Soll-Ist-Vergleich für Tag, Woche, Monat, Jahr und Gesamtlaufzeit. 
* **Visualisierung:** Zeit-Graph mit linearer Ideal-Linie (Soll) und tatsächlichem Verlauf (Ist). Integriertes Ampelsystem (Rot/Grün) für den Statusbericht.

**4. Datenbank-Struktur (SQLite)**
* **Tabelle `settings`:** Speicherung der App-Konfiguration (Key/Value).
* **Tabelle `mileage_logs`:** Historie der Einträge (Datum, absoluter km-Stand).

**5. Berechnungslogik**
* Dynamische Berechnung der vergangen Tage seit Vertragsbeginn.
* Tagesgenaue Berechnung des erlaubten Soll-Standes: `(Vergangene Tage / Gesamttage) * (Gesamtbudget + Freigrenze)`.
* Automatischer Abgleich des berechneten Solls mit dem zuletzt geloggten Ist-Stand aus der Datenbank.