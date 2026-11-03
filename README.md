# Die Wortqueste

Gra platformowa w przeglądarce do nauki niemieckiego (B1). Uczennica wybiera czarodzieja i biega po magicznym zamku – zaczarowane drzwi otwierają się dopiero po rozwiązaniu zadania z ostatniej Lektion, a latające księgi zaklęć dają zadania bonusowe. Na końcu wieży sfinks zadaje pytania pisemne.

Zagraj: <https://magdakalita.github.io/wortqueste/>

- 4 poziomy o rosnącej trudności: Wortschatz → Redemittel & Satzbau → Grammatik → Schreiben
- 6 typów zadań: uzupełnianie luk, układanie wyrazów, dopasowywanie par, wybór odpowiedzi, przekształcanie zdań, odpowiedź pisemna
- zła odpowiedź = podpowiedź i druga próba, potem rozwiązanie z wyjaśnieniem (bez „game over” za błędy językowe)
- odpowiedzi pisemne trafiają automatycznie do arkusza Google nauczycielki
- postęp zapisuje się w przeglądarce

Gra to statyczna strona (`web/`) – bez serwera i bez kosztów. Python (`src/spiel/`) służy tylko jako narzędzie do przygotowywania zadań.

## Granie lokalnie

```sh
python3 -m http.server -d web 8000
```

Potem otwórz <http://localhost:8000> w Chrome. Dodaj `?alle` do adresu (<http://localhost:8000/?alle>), żeby odblokować wszystkie poziomy – przydatne do sprawdzania.

## Przegląd zadań

Lista wszystkich zadań z rozwiązaniami do przejrzenia przed udostępnieniem gry:

```sh
uv run spiel review web/data/lektion06.json --out zadania_lektion06.md
```

Zadania można poprawiać bezpośrednio w `web/data/lektion06.json`. Po zmianach sprawdź plik:

```sh
uv run spiel validate
```

## Nowa Lektion

1. Zrób zdjęcia lub zrzuty ekranu stron lekcji i wrzuć je do folderu, np. `screens/lektion07/` (folder `screens/` nie trafia do repozytorium – to strony z podręcznika).
2. Wygeneruj zadania (potrzebny dostęp do Claude API – zmienna `ANTHROPIC_API_KEY` w pliku `.env` albo `ant auth login`):

   ```sh
   uv run --env-file .env spiel generate screens/lektion07 --lektion 7 --title "Tytuł lekcji"
   ```

   Skrypt zapisuje `web/data/lektion07.json`, dopisuje lekcję do menu (`web/data/lektionen.json`) i tworzy listę do przeglądu `zadania_lektion07.md`.
3. Przejrzyj zadania, popraw w razie potrzeby i uruchom `uv run spiel validate`.

Liczba zadań na poziom może być dowolna (6–14) – plansze dopasowują się same.

## Odpowiedzi pisemne → arkusz Google

1. Utwórz Formularz Google z pięcioma pytaniami typu „Krótka odpowiedź” / „Akapit”: **Name**, **Lektion**, **Level**, **Aufgabe**, **Antwort**.
2. W formularzu: ⋮ → „Pobierz link wstępnie wypełniony”, wpisz cokolwiek w każde pole i kliknij „Pobierz link”. Link zawiera pola w postaci `entry.123456789=…` – to są identyfikatory pól.
3. Adres formularza ma postać `https://docs.google.com/forms/d/e/<ID>/viewform`. Zamień `viewform` na `formResponse`.
4. Wpisz adres i identyfikatory do `web/js/submit.js`:

   ```js
   export const FORM = {
     action: "https://docs.google.com/forms/d/e/<ID>/formResponse",
     fields: { name: "entry.111", lektion: "entry.222", level: "entry.333", task: "entry.444", answer: "entry.555" },
   };
   ```

5. W zakładce „Odpowiedzi” formularza połącz go z Arkuszem Google – tam pojawią się teksty uczennicy.

Dopóki formularz nie jest skonfigurowany, teksty zapisują się w przeglądarce uczennicy, a na ekranie podsumowania poziomu jest przycisk „Texte kopieren”.

## Publikacja (GitHub Pages)

Repozytorium zawiera workflow `.github/workflows/pages.yml`, który publikuje folder `web/` przy każdym pushu na `main`.

1. Utwórz repozytorium na GitHubie i wypchnij kod.
2. W repozytorium: Settings → Pages → Source: **GitHub Actions**.
3. Po kilku minutach gra jest dostępna pod adresem `https://<użytkownik>.github.io/<repozytorium>/` – ten link wysyłasz uczennicy.

Uwaga: pliki z zadaniami są publiczne (tak działa statyczna strona), więc ktoś bardzo dociekliwy znajdzie w nich rozwiązania.

## Struktura

```
web/                   gra (publikowana)
  js/engine/           silnik: fizyka, kolizje, sterowanie, dźwięki
  js/levels/           budowanie plansz z gotowych fragmentów
  js/tasks/            okno zadania i 6 typów zadań
  js/sprites.js        grafika pixel art rysowana w kodzie
  js/submit.js         wysyłka odpowiedzi do Google Forms
  data/                zadania (lektionNN.json) i lista lekcji
src/spiel/             narzędzia: generate, validate, review
```
