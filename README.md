# 🌱 Plant Guardian

**Twój osobisty asystent w pielęgnacji roślin**

Plant Guardian to aplikacja webowa do zarządzania kolekcją roślin domowych. Śledź harmonogram podlewania, prowadź dziennik zabiegów pielęgnacyjnych i nigdy nie zapomnij o potrzebach swoich roślin!

> 🚀 **Live Demo:** [https://plant-guardian-gamma.vercel.app/](https://plant-guardian-gamma.vercel.app/)

---

## ✨ Główne funkcjonalności

### 🔐 Autoryzacja i bezpieczeństwo
- Rejestracja i logowanie użytkowników przez Supabase Auth
- Zabezpieczone strony wymagające uwierzytelnienia
- Prywatne dane użytkownika (każdy widzi tylko swoje rośliny)

### 🌿 Zarządzanie roślinami
- **Dodawanie roślin** z podstawowymi informacjami (nazwa, gatunek, częstotliwość podlewania)
- **Integracja z Perenual API** – wyszukiwanie roślin w bazie danych i automatyczne wypełnianie formularza
- **Dashboard** z przeglądem wszystkich roślin i ich statusem podlewania
- **System alertów** – wizualne oznaczenie roślin wymagających podlewania
- **Szybkie podlewanie** – aktualizacja daty podlewania jednym kliknięciem
- **Edycja i usuwanie**

### 📓 Dziennik pielęgnacji
- Prowadzenie szczegółowej historii zabiegów dla każdej rośliny
- Typy zabiegów: oprysk, przycinanie, pasożyty, nawożenie
- Rejestracja preparatów, stężeń i notatek
- **Edycja i usuwanie** wpisów w dzienniku
- Przejrzysta tabela z pełną historią

### 📊 Statystyki
- Łączna liczba roślin w kolekcji
- Liczba zabiegów w bieżącym miesiącu
- Identyfikacja najstarszej rośliny w kolekcji

### 💧 Inteligentne przypomnienia
- Automatyczne obliczanie daty następnego podlewania
- Statusy: "W porządku", "Niedługo podlej", "Wymaga podlewania!"
- Kolorowe oznakowanie dla łatwej identyfikacji

---

## 🛠️ Technologie

### Frontend
- **HTML5** – Struktura aplikacji
- **CSS3** – Nowoczesny, responsywny design
- **Vanilla JavaScript** – Logika aplikacji (bez frameworków)

### Backend & Baza danych
- **Supabase** – Backend-as-a-Service
  - PostgreSQL database
  - Authentication
  - Real-time updates
  - Row Level Security (RLS)

### API
- **Perenual Plant API** – Baza danych roślin do wyszukiwania

### Hosting
- **Live Server** – Development
- **Vercel/Netlify** – Production deployment

---

## 🚀 Instrukcja uruchomienia lokalnie

### Wymagania wstępne
- **Przeglądarka** internetowa (Chrome, Firefox, Edge, Safari)
- **Live Server** – wtyczka do VS Code lub podobne narzędzie
- **Konta:**
  - [Supabase](https://supabase.com) – darmowe konto
  - [Perenual API](https://perenual.com/docs/api) – darmowy klucz API

---

### Krok 1: Klonowanie repozytorium

```bash
git clone https://github.com/KWeron/plant-guardian.git
cd plant-guardian
```

---

### Krok 2: Konfiguracja zmiennych środowiskowych ⚠️

**To jest KLUCZOWY krok! Bez niego aplikacja nie zadziała.**

#### 🔒 Dlaczego zarządzamy kluczami API w ten sposób?

Klucze API są **poufnymi danymi** i nie mogą być commitowane do repozytorium Git. Gdyby były widoczne publicznie, każdy mógłby ich użyć, co mogłoby prowadzić do:
- Nadużycia Twojego konta
- Wyczerpania limitów darmowego planu
- Problemów z bezpieczeństwem danych

Dlatego używamy systemu z **dwoma plikami**:
- `config.example.js` – template z placeholder'ami (commitowany do Git)
- `config.js` – Twoje prawdziwe klucze (ignorowany przez Git)

#### 📝 Kroki konfiguracji:

**1. Skopiuj plik przykładowy:**
```bash
cp config.example.js config.js
```

**2. Otwórz plik `config.js` i uzupełnij swoje klucze API:**


**3. Weryfikacja `.gitignore`:**

Upewnij się, że plik `.gitignore` zawiera linię:
```
config.js
```

---

### Krok 3: Konfiguracja bazy danych Supabase

Przed pierwszym uruchomieniem aplikacji musisz utworzyć tabele w Supabase.

**1. Przejdź do Supabase Dashboard → SQL Editor**

**2. Wykonaj skrypt SQL z pliku `database/plants.sql`:**

Skopiuj i uruchom zawartość pliku, który utworzy:
- Tabelę `plants` (rośliny użytkownika)
- Tabelę `care_logs` (dziennik pielęgnacji)
- Row Level Security (RLS) policies

**3. Zweryfikuj, czy tabele zostały utworzone:**
- Przejdź do **Table Editor** w Supabase
- Powinieneś zobaczyć tabele `plants` i `care_logs`

---

### Krok 4: Uruchomienie aplikacji

**Nie ma instalacji paczek npm!** 🎉

Aplikacja jest napisana w Vanilla JavaScript i działa bezpośrednio w przeglądarce.

#### VS Code Live Server (zalecane)

1. Zainstaluj rozszerzenie **Live Server** w VS Code
2. Otwórz folder projektu w VS Code
3. Kliknij prawym przyciskiem na `index.html`
4. Wybierz **"Open with Live Server"**
5. Aplikacja otworzy się w przeglądarce pod adresem `http://127.0.0.1:5500`

---

### Krok 5: Pierwsze użycie

1. **Zarejestruj się** – Utwórz nowe konto
2. **Potwierdź email** – Sprawdź skrzynkę pocztową i potwierdź rejestrację
3. **Zaloguj się** – Wprowadź email i hasło
4. **Dodaj pierwszą roślinę** – Kliknij "Dodaj nową roślinę"
5. Gotowe! 🌱

---

## 📁 Struktura projektu

```
plant-guardian/
├── index.html           # Strona główna
├── dashboard.html       # Dashboard z przeglądem roślin
├── add.html            # Formularz dodawania rośliny
├── details.html        # Szczegóły pojedynczej rośliny
├── edit.html           # Edycja rośliny
├── journal.html        # Dziennik pielęgnacji
├── stats.html          # Statystyki użytkownika
├── app.js              # Główna logika aplikacji
├── style.css           # Stylowanie aplikacji
├── config.js           # Klucze API
├── config.example.js   # Szablon konfiguracji
├── .gitignore          # Ignorowane pliki
├── database/
│   └── plants.sql      # Skrypt tworzenia tabel w Supabase
└── README.md           
```

---

## 📝 Licencja

Ten projekt został stworzony do celów edukacyjnych.

---

