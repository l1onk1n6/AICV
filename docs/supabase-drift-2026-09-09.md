# Repo vs. Produktion: Edge Functions (Stand 2026-09-09)

Gemessen ueber die Supabase Management API gegen Projekt `kopabtqajeyjalmglgjp`.
Der Live-Quelltext stammt aus den deployten Bundles (`/v1/projects/{ref}/functions/{slug}/body`),
der Vergleich ueber die String-Literale, die eine Transpilation unveraendert ueberstehen.

## 1. Vier Functions liefen live, fehlten im Repo

`contact-form`, `contact-form-public`, `get-shared-docs`, `track-view`.
Mit diesem Commit sind sie zurueck im Repo (Quelle: deploytes Bundle, die
TypeScript-Typannotationen hat der Deploy-Schritt entfernt).

## 2. Eine Function liegt im Repo, ist aber nicht deployt

`sync-subscription` — nie ausgerollt. Entweder deployen oder loeschen; ein
Repo-Eintrag ohne Gegenstueck in Produktion ist eine Falle fuer den naechsten Leser.

## 3. Drei Functions sind inhaltlich auseinandergelaufen

**Ein Merge, der diese Dateien anfasst, wirft den Live-Stand weg.** Vor jeder
Aenderung an ihnen zuerst den Live-Stand zurueckholen.

| Function | Was live existiert und im Repo fehlt |
| --- | --- |
| `stripe-webhook` | LinkedIn Conversion API (`rest/conversionEvents`, `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_CONVERSION_ID`, SHA256-gehashte E-Mail), Referral-Gutschrift „CHF 5.00 credit", ausfuehrlichere Signaturfehler |
| `send-deadline-reminders` | komplett neues Mail-Template (dunkel, `#13131f`, Dringlichkeitsfarben `#FF3B30`/`#FF9F0A`/`#30D158`) und geaenderte Abfragelogik |
| `upsert-deadline-reminders` | zusaetzlicher Zweig „No email address available" |

Umgekehrt hat `create-checkout-session` im Repo Logik, die live fehlt
(monthly/yearly, Preis-ID `price_1TOiqjFR6KM5Wltx…`) — dort ist die Produktion
der aeltere Stand.

## 4. JWT-Marker und Live-Zustand widersprechen sich

`supabase-functions.yml` entscheidet ueber `--no-verify-jwt` anhand des Markers
`// JWT enforcement: OFF` im Quelltext. Gemessener Abgleich:

| Function | Marker im Repo ergaebe | Live `verify_jwt` |
| --- | --- | --- |
| `admin-set-plan` | an | **aus** |
| `create-checkout-session` | an | **aus** |
| `create-portal-session` | an | **aus** |
| `on-user-signup` | **aus** | an |

Der naechste Deploy dieser vier kippt den Gateway-Schutz jeweils in die andere
Richtung — bei `on-user-signup` von an nach aus, also eine stille Verschlechterung.
Bewusst in diesem Commit nicht korrigiert: das Anfassen der Datei loest den Deploy
aus, und bei `on-user-signup` weicht der Repo-Stand vom Live-Stand ab.

## 5. `stripe-webhook` ist am Gateway verriegelt

Gemessen am 2026-09-09:

```
POST /functions/v1/stripe-webhook  ohne Key   -> 401 UNAUTHORIZED_NO_AUTH_HEADER
POST /functions/v1/stripe-webhook  mit  Key   -> 400 "Missing signature"
```

Die Function selbst prueft die Stripe-Signatur korrekt
(`stripe.webhooks.constructEventAsync`) — sie kommt aber nur zum Zug, wenn der
Aufruf am Gateway vorbeikommt. Stripe sendet keinen Supabase-JWT. Solange die
Webhook-URL im Stripe-Dashboard keinen `apikey`-Parameter traegt, schlaegt jede
Zustellung mit 401 fehl und kein Abo wird in der Datenbank aktiviert.
Nicht von hier pruefbar: die tatsaechlich hinterlegte URL und die
Zustellhistorie (Stripe-Dashboard → Developers → Webhooks).
