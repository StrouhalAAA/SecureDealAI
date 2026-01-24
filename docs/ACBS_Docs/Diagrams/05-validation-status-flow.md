# Tok validačních stavů - Kompletní cesta

Stavový diagram zobrazující kompletní validační proces se všemi třemi fázemi.

<!-- Pro Azure DevOps Wiki použij ::: mermaid ... ::: syntaxi -->
<!-- Pro GitHub/standardní Markdown funguje ```mermaid -->

::: mermaid
stateDiagram-v2
    [*] --> NahravaniDokumentu: Zahájení nákupu

    NahravaniDokumentu --> OCR_Zpracovani: Dokumenty přijaty
    OCR_Zpracovani --> ExtrakceData: OCR dokončeno

    ExtrakceData --> Faze1: Extrakce VIN, SPZ, Jméno

    state Faze1 {
        [*] --> Kontrola_VIN
        Kontrola_VIN --> Kontrola_SPZ: Shoda
        Kontrola_VIN --> CERVENA_VIN: Neshoda
        Kontrola_SPZ --> Kontrola_Vlastnika: Shoda
        Kontrola_SPZ --> CERVENA_SPZ: Neshoda
        Kontrola_Vlastnika --> Faze1_OK: Shoda
        Kontrola_Vlastnika --> CERVENA_Vlastnik: Neshoda
    }

    Faze1 --> Faze2: Fáze 1 OK
    Faze1 --> BLOKOVANO_F1: Fáze 1 SELHALA

    state Faze2 {
        [*] --> Kontrola_Cebia
        Kontrola_Cebia --> Kontrola_Insolvence: Dotaz
        Kontrola_Insolvence --> Kontrola_Exekuce: Bez insolvence
        Kontrola_Insolvence --> CERVENA_Insolvence: Nalezena
        Kontrola_Exekuce --> Kontrola_Zastavy: Bez exekuce
        Kontrola_Exekuce --> CERVENA_Exekuce: Nalezena
        Kontrola_Zastavy --> Kontrola_ARES: Čistý
        Kontrola_Zastavy --> CERVENA_Zastava: Nalezena
        Kontrola_ARES --> Kontrola_Ucet: Ověřeno
        Kontrola_Ucet --> Faze2_OK: Shoda
        Kontrola_Ucet --> CERVENA_Ucet: Neshoda
    }

    Faze2 --> Faze3: Fáze 2 OK
    Faze2 --> BLOKOVANO_F2: Fáze 2 SELHALA

    state Faze3 {
        [*] --> Identifikace_UseCase
        Identifikace_UseCase --> UC_Privat: PRIVÁT
        Identifikace_UseCase --> UC_Firma: FIRMA
        Identifikace_UseCase --> UC_Specialni: Speciální

        UC_Privat --> Kontrola_SJM: Ženatý/Vdaná
        UC_Privat --> Jednoduche_OK: Jednoduché
        Kontrola_SJM --> Kontrola_Manzel: Cenový práh
        Kontrola_Manzel --> Faze3_OK: Souhlas OK
        Kontrola_Manzel --> CERVENA_Manzel: Chybí

        UC_Firma --> Kontrola_Jednatele: Ověření
        Kontrola_Jednatele --> Faze3_OK: Oprávněn
        Kontrola_Jednatele --> CERVENA_Opravneni: Neoprávněn

        UC_Specialni --> Specialni_Doklady: Kontrola dokladů
        Specialni_Doklady --> Faze3_OK: Kompletní
        Specialni_Doklady --> CERVENA_Doklady: Chybí

        Jednoduche_OK --> Faze3_OK
    }

    Faze3 --> ZELENA_VseOK: Fáze 3 OK
    Faze3 --> ORANZOVA_Varovani: Fáze 3 VAROVÁNÍ
    Faze3 --> BLOKOVANO_F3: Fáze 3 SELHALA

    ZELENA_VseOK --> [*]: Pokračovat k platbě
    ORANZOVA_Varovani --> [*]: Pokračovat s opatrností
    BLOKOVANO_F1 --> [*]: BLOKOVÁNO - Opravit data
    BLOKOVANO_F2 --> [*]: BLOKOVÁNO - Externí problém
    BLOKOVANO_F3 --> [*]: BLOKOVÁNO - Chybí oprávnění
:::
