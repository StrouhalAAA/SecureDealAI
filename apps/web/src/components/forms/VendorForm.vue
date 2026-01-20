<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-bold mb-6">Krok 2: Data dodavatele</h2>

    <!-- Vendor Type Toggle -->
    <fieldset class="mb-6">
      <legend class="block text-sm font-medium text-gray-700 mb-2">
        Typ dodavatele
      </legend>
      <div class="flex flex-col sm:flex-row gap-4" role="radiogroup" aria-label="Typ dodavatele">
        <label class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
          <input
            type="radio"
            v-model="vendorType"
            value="PHYSICAL_PERSON"
            class="mr-2 w-4 h-4 text-blue-600 focus:ring-blue-500"
            name="vendor-type"
          />
          <span>Fyzicka osoba</span>
        </label>
        <label class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
          <input
            type="radio"
            v-model="vendorType"
            value="COMPANY"
            class="mr-2 w-4 h-4 text-blue-600 focus:ring-blue-500"
            name="vendor-type"
          />
          <span>Pravnicka osoba</span>
        </label>
      </div>
    </fieldset>

    <!-- OCR Data Warning Banner - Physical Person missing RC -->
    <div
      v-if="isOcrCreated && vendorType === 'PHYSICAL_PERSON' && !form.personal_id"
      class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
      role="alert"
    >
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h4 class="font-medium text-yellow-800">Data z OCR - doplnte rodne cislo</h4>
          <p class="text-sm text-yellow-700 mt-1">
            Udaje dodavatele byly automaticky nacteny z technickeho prukazu.
            Pro dokonceni je nutne doplnit rodne cislo.
          </p>
        </div>
      </div>
    </div>

    <!-- OCR Data Warning Banner - Company missing ICO -->
    <div
      v-if="isOcrCreated && vendorType === 'COMPANY' && !form.company_id"
      class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
      role="alert"
    >
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h4 class="font-medium text-yellow-800">Data z OCR - doplnte ICO</h4>
          <p class="text-sm text-yellow-700 mt-1">
            Dodavatel byl identifikovan jako pravnicka osoba z technickeho prukazu.
            Pro dokonceni je nutne doplnit ICO.
          </p>
        </div>
      </div>
    </div>

    <!-- OCR Data Success Banner - Company ICO pre-filled -->
    <div
      v-if="isOcrCreated && vendorType === 'COMPANY' && form.company_id && !aresVerified"
      class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"
      role="status"
    >
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h4 class="font-medium text-blue-800">ICO nacteno z OCR</h4>
          <p class="text-sm text-blue-700 mt-1">
            ICO bylo automaticky extrahováno z dokumentu. Overeni v ARES probehne automaticky.
          </p>
        </div>
      </div>
    </div>

    <!-- Contact vs OCR Comparison Warning -->
    <div
      v-if="props.contactOcrComparison && !props.contactOcrComparison.matches"
      class="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg"
      role="alert"
    >
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h4 class="font-medium text-orange-800">Kontakt se lisi od Majitele/Provozovatele z dokumentu</h4>
          <p class="text-sm text-orange-700 mt-1">
            Udaje kontaktu se neshoduji s daty z technickeho prukazu. Overite prosim, ze dodavatel je spravny.
          </p>
          <div class="mt-2 text-sm text-orange-700">
            <div v-for="diff in props.contactOcrComparison.differences" :key="diff.field" class="flex gap-2">
              <span class="font-medium">{{ diff.field }}:</span>
              <span>Kontakt: <span class="font-mono">{{ diff.contact || '(nevyplneno)' }}</span></span>
              <span>vs</span>
              <span>Dokument: <span class="font-mono">{{ diff.ocr || '(nevyplneno)' }}</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <form @submit.prevent="saveAndContinue" novalidate>
      <!-- COMPANY FORM -->
      <template v-if="vendorType === 'COMPANY'">
        <!-- ICO with ARES lookup -->
        <div class="mb-4">
          <label :for="icoInputId" class="block text-sm font-medium text-gray-700 mb-1">
            ICO <span class="text-red-500" aria-label="povinna polozka">*</span>
            <span v-if="isOcrCreated && form.company_id && autoFilled.company_id" class="text-blue-600 text-xs ml-2" aria-live="polite">
              (z OCR)
            </span>
          </label>
          <div class="flex flex-col sm:flex-row gap-2">
            <input
              :id="icoInputId"
              ref="icoInputRef"
              v-model="form.company_id"
              type="text"
              class="flex-1 px-4 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              :class="{
                'border-gray-300': !icoTouched,
                'border-green-500 bg-green-50': icoTouched && isValidIco,
                'border-red-500 bg-red-50': icoTouched && form.company_id && !isValidIco,
              }"
              placeholder="8 cislic"
              maxlength="8"
              inputmode="numeric"
              required
              :aria-describedby="icoTouched && icoError ? icoErrorId : undefined"
              :aria-invalid="icoTouched && !!icoError"
              @input="onIcoInput"
              @blur="icoTouched = true"
            />
            <LoadingButton
              type="button"
              @click="lookupAres"
              :disabled="!isValidIco"
              :loading="aresLoading"
              loading-text="Overuji..."
              variant="secondary"
              size="md"
              aria-label="Overit ICO v registru ARES"
            >
              Overit
            </LoadingButton>
          </div>
          <p v-if="icoTouched && icoError" :id="icoErrorId" class="text-red-500 text-xs mt-1" role="alert">
            {{ icoError }}
          </p>
          <AresStatus :status="aresStatus" :message="aresMessage" class="mt-2" />
        </div>

        <!-- Company Name -->
        <div class="mb-4">
          <label :for="companyNameInputId" class="block text-sm font-medium text-gray-700 mb-1">
            Nazev firmy <span class="text-red-500" aria-label="povinna polozka">*</span>
            <span v-if="autoFilled.name" class="text-green-600 text-xs ml-2" aria-live="polite">
              (vyplneno z ARES)
            </span>
          </label>
          <input
            :id="companyNameInputId"
            v-model="form.name"
            type="text"
            class="w-full px-4 py-2 border rounded-lg uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="{
              'border-gray-300': !autoFilled.name && !nameTouched,
              'bg-green-50 border-green-300': autoFilled.name,
              'border-green-500': nameTouched && form.name && !autoFilled.name,
              'border-red-500 bg-red-50': nameTouched && !form.name,
            }"
            required
            :aria-describedby="nameTouched && !form.name ? nameErrorId : undefined"
            :aria-invalid="nameTouched && !form.name"
            @blur="nameTouched = true"
          />
          <p v-if="nameTouched && !form.name" :id="nameErrorId" class="text-red-500 text-xs mt-1" role="alert">
            Nazev firmy je povinne pole
          </p>
        </div>

        <!-- VAT Payer Toggle -->
        <div class="mb-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              v-model="form.is_vat_payer"
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span class="text-sm font-medium text-gray-700">Platce DPH</span>
          </label>
        </div>

        <!-- DIC (shown only when is_vat_payer is true) -->
        <div v-if="form.is_vat_payer" class="mb-4">
          <label for="dic-input" class="block text-sm font-medium text-gray-700 mb-1">
            DIC <span class="text-red-500" aria-label="povinna polozka">*</span>
            <span v-if="autoFilled.vat_id" class="text-green-600 text-xs ml-2" aria-live="polite">
              (vyplneno z ARES)
            </span>
          </label>
          <input
            id="dic-input"
            v-model="form.vat_id"
            type="text"
            class="w-full px-4 py-2 border rounded-lg uppercase font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="{
              'border-gray-300': !autoFilled.vat_id && !vatIdTouched,
              'bg-green-50 border-green-300': autoFilled.vat_id,
              'border-red-500 bg-red-50': vatIdTouched && form.is_vat_payer && !form.vat_id,
            }"
            placeholder="CZxxxxxxxx"
            required
            :aria-invalid="vatIdTouched && form.is_vat_payer && !form.vat_id"
            @blur="vatIdTouched = true"
          />
          <p v-if="vatIdTouched && form.is_vat_payer && !form.vat_id" class="text-red-500 text-xs mt-1" role="alert">
            DIC je povinne pro platce DPH
          </p>
        </div>
      </template>

      <!-- PHYSICAL PERSON FORM -->
      <template v-else>
        <!-- Name -->
        <div class="mb-4">
          <label :for="personNameInputId" class="block text-sm font-medium text-gray-700 mb-1">
            Jmeno a prijmeni <span class="text-red-500" aria-label="povinna polozka">*</span>
            <span v-if="isOcrCreated && autoFilled.name" class="text-blue-600 text-xs ml-2" aria-live="polite">
              (z OCR)
            </span>
          </label>
          <input
            :id="personNameInputId"
            ref="personNameInputRef"
            v-model="form.name"
            type="text"
            class="w-full px-4 py-2 border rounded-lg uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="{
              'border-gray-300': !nameTouched,
              'border-green-500 bg-green-50': nameTouched && form.name,
              'border-red-500 bg-red-50': nameTouched && !form.name,
            }"
            placeholder="JMENO PRIJMENI"
            required
            autocomplete="name"
            :aria-describedby="nameTouched && !form.name ? personNameErrorId : undefined"
            :aria-invalid="nameTouched && !form.name"
            @blur="nameTouched = true"
          />
          <p v-if="nameTouched && !form.name" :id="personNameErrorId" class="text-red-500 text-xs mt-1" role="alert">
            Jmeno a prijmeni je povinne pole
          </p>
        </div>

        <!-- Personal ID + DOB -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label :for="rcInputId" class="block text-sm font-medium text-gray-700 mb-1">
              Rodne cislo <span class="text-red-500" aria-label="povinna polozka">*</span>
            </label>
            <input
              :id="rcInputId"
              v-model="form.personal_id"
              type="text"
              class="w-full px-4 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              :class="{
                'border-gray-300': !rcTouched,
                'border-green-500 bg-green-50': rcTouched && form.personal_id && !rcError,
                'border-red-500 bg-red-50': rcTouched && rcError,
              }"
              placeholder="######/####"
              inputmode="numeric"
              required
              :aria-describedby="rcTouched && rcError ? rcErrorId : undefined"
              :aria-invalid="rcTouched && !!rcError"
              @input="formatRodneCislo"
              @blur="rcTouched = true"
            />
            <p v-if="rcTouched && rcError" :id="rcErrorId" class="text-red-500 text-xs mt-1" role="alert">
              {{ rcError }}
            </p>
            <p v-else-if="rcTouched && form.personal_id && !rcError" class="text-green-600 text-xs mt-1">
              Platne rodne cislo
            </p>
          </div>
          <div>
            <label for="dob-input" class="block text-sm font-medium text-gray-700 mb-1">
              Datum narozeni
            </label>
            <input
              id="dob-input"
              v-model="form.date_of_birth"
              type="date"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <!-- Document Number + Expiry -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label for="op-number-input" class="block text-sm font-medium text-gray-700 mb-1">
              Cislo OP
            </label>
            <input
              id="op-number-input"
              v-model="form.document_number"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="napr. 217215163"
            />
          </div>
          <div>
            <label for="op-expiry-input" class="block text-sm font-medium text-gray-700 mb-1">
              Platnost OP do
            </label>
            <input
              id="op-expiry-input"
              v-model="form.document_expiry_date"
              type="date"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </template>

      <!-- COMMON FIELDS -->
      <!-- Address -->
      <div class="mb-4">
        <label for="street-input" class="block text-sm font-medium text-gray-700 mb-1">
          Ulice
          <span v-if="autoFilled.address && !isOcrCreated" class="text-green-600 text-xs ml-2" aria-live="polite">
            (vyplneno z ARES)
          </span>
          <span v-else-if="isOcrCreated && autoFilled.address" class="text-blue-600 text-xs ml-2" aria-live="polite">
            (z OCR)
          </span>
        </label>
        <input
          id="street-input"
          v-model="form.address_street"
          type="text"
          class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          :class="{
            'border-gray-300': !autoFilled.address,
            'bg-green-50 border-green-300': autoFilled.address,
          }"
          autocomplete="street-address"
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label :for="cityInputId" class="block text-sm font-medium text-gray-700 mb-1">
            Mesto <span class="text-red-500" aria-label="povinna polozka">*</span>
          </label>
          <input
            :id="cityInputId"
            v-model="form.address_city"
            type="text"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="{
              'border-gray-300': !autoFilled.address && !cityTouched,
              'bg-green-50 border-green-300': autoFilled.address,
              'border-green-500': cityTouched && form.address_city && !autoFilled.address,
              'border-red-500 bg-red-50': cityTouched && !form.address_city && !autoFilled.address,
            }"
            required
            autocomplete="address-level2"
            :aria-describedby="cityTouched && !form.address_city ? cityErrorId : undefined"
            :aria-invalid="cityTouched && !form.address_city"
            @blur="cityTouched = true"
          />
          <p v-if="cityTouched && !form.address_city" :id="cityErrorId" class="text-red-500 text-xs mt-1" role="alert">
            Mesto je povinne pole
          </p>
        </div>
        <div>
          <label :for="pscInputId" class="block text-sm font-medium text-gray-700 mb-1">
            PSC <span class="text-red-500" aria-label="povinna polozka">*</span>
          </label>
          <input
            :id="pscInputId"
            v-model="form.address_postal_code"
            type="text"
            class="w-full px-4 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="{
              'border-gray-300': !autoFilled.address && !pscTouched,
              'bg-green-50 border-green-300': autoFilled.address,
              'border-green-500': pscTouched && form.address_postal_code && !autoFilled.address,
              'border-red-500 bg-red-50': pscTouched && !form.address_postal_code && !autoFilled.address,
            }"
            placeholder="xxxxx"
            required
            maxlength="5"
            inputmode="numeric"
            autocomplete="postal-code"
            :aria-describedby="pscTouched && !form.address_postal_code ? pscErrorId : undefined"
            :aria-invalid="pscTouched && !form.address_postal_code"
            @blur="pscTouched = true"
          />
          <p v-if="pscTouched && !form.address_postal_code" :id="pscErrorId" class="text-red-500 text-xs mt-1" role="alert">
            PSC je povinne pole
          </p>
        </div>
      </div>

      <!-- Contact -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label for="phone-input" class="block text-sm font-medium text-gray-700 mb-1">
            Telefon
          </label>
          <input
            id="phone-input"
            v-model="form.phone"
            type="tel"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="+420 xxx xxx xxx"
            autocomplete="tel"
          />
        </div>
        <div>
          <label for="email-input" class="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email-input"
            v-model="form.email"
            type="email"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autocomplete="email"
          />
        </div>
      </div>

      <!-- Bank Account -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Bankovni ucet
          <span v-if="autoFilled.bank_account" class="text-green-600 text-xs ml-2" aria-live="polite">
            (z registru ADIS)
          </span>
        </label>

        <!-- Registered bank accounts from ADIS (radio list) -->
        <div v-if="registeredBankAccounts.length > 0" class="space-y-2 mb-3">
          <div
            v-for="(account, index) in registeredBankAccounts"
            :key="account"
            class="flex items-center"
          >
            <input
              :id="`bank-account-${index}`"
              type="radio"
              :value="account"
              v-model="form.bank_account"
              @change="onBankAccountSourceChange('registered', account)"
              class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              name="bank-account-selection"
            />
            <label
              :for="`bank-account-${index}`"
              class="ml-2 font-mono text-sm cursor-pointer hover:text-blue-600"
              :class="{
                'text-green-700 font-medium': form.bank_account === account,
                'text-gray-700': form.bank_account !== account,
              }"
            >
              {{ account }}
              <span class="text-xs text-green-600 ml-1">(registrovan v ADIS)</span>
            </label>
          </div>

          <!-- Manual entry option -->
          <div class="flex items-center">
            <input
              id="bank-account-manual"
              type="radio"
              value="manual"
              :checked="bankAccountSource === 'manual'"
              @change="onBankAccountSourceChange('manual')"
              class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              name="bank-account-selection"
            />
            <label
              for="bank-account-manual"
              class="ml-2 text-sm cursor-pointer text-gray-700 hover:text-blue-600"
            >
              Jiny ucet (zadat rucne)
            </label>
          </div>

          <!-- Manual input field (shown only when "Jiny ucet" is selected) -->
          <div v-if="bankAccountSource === 'manual'" class="ml-6 mt-2">
            <input
              id="bank-account-input"
              v-model="form.bank_account"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="cislo uctu/kod banky"
            />
          </div>
        </div>

        <!-- Simple input when no ADIS accounts available -->
        <div v-else>
          <input
            id="bank-account-input"
            v-model="form.bank_account"
            type="text"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="cislo uctu/kod banky"
          />
          <p v-if="vendorType === 'COMPANY' && aresVerified && registeredBankAccounts.length === 0" class="text-gray-500 text-xs mt-1">
            <span class="inline-flex items-center">
              <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
              </svg>
              Zadne registrovane ucty v ADIS
            </span>
          </p>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200" role="alert">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
          <span>{{ error }}</span>
        </div>
      </div>

      <!-- Buttons -->
      <div class="flex flex-col sm:flex-row justify-between gap-2">
        <LoadingButton
          type="button"
          @click="$emit('back')"
          variant="outline"
          size="md"
        >
          Zpet
        </LoadingButton>
        <LoadingButton
          type="submit"
          :loading="loading"
          :disabled="!isValid"
          loading-text="Ukladam..."
          variant="primary"
          size="md"
        >
          Dalsi krok
        </LoadingButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { debounce } from 'lodash-es';
import { supabase } from '@/composables/useSupabase';
import { useErrorHandler } from '@/composables/useErrorHandler';
import AresStatus from '@/components/shared/AresStatus.vue';
import LoadingButton from '@/components/shared/LoadingButton.vue';
import type { Vendor, AresStatusType, Contact } from '@/types';
import type { ContactOcrComparison } from '@/composables/useDetailData';

const props = defineProps<{
  buyingOpportunityId: string;
  existingVendor?: Vendor | null;
  contact?: Contact | null;
  contactOcrComparison?: ContactOcrComparison | null;
}>();

const emit = defineEmits<{
  (e: 'saved', vendor: Vendor): void;
  (e: 'next'): void;
  (e: 'back'): void;
}>();

const { handleError } = useErrorHandler();

// Generate unique IDs for accessibility
const uniqueId = Math.random().toString(36).substr(2, 9);
const icoInputId = `ico-input-${uniqueId}`;
const icoErrorId = `ico-error-${uniqueId}`;
const companyNameInputId = `company-name-input-${uniqueId}`;
const nameErrorId = `name-error-${uniqueId}`;
const personNameInputId = `person-name-input-${uniqueId}`;
const personNameErrorId = `person-name-error-${uniqueId}`;
const rcInputId = `rc-input-${uniqueId}`;
const rcErrorId = `rc-error-${uniqueId}`;
const cityInputId = `city-input-${uniqueId}`;
const cityErrorId = `city-error-${uniqueId}`;
const pscInputId = `psc-input-${uniqueId}`;
const pscErrorId = `psc-error-${uniqueId}`;

// Refs for focus management
const icoInputRef = ref<HTMLInputElement | null>(null);
const personNameInputRef = ref<HTMLInputElement | null>(null);

// Form state
const vendorType = ref<'PHYSICAL_PERSON' | 'COMPANY'>('COMPANY');

const form = ref({
  name: '',
  company_id: '',
  is_vat_payer: false,
  vat_id: '',
  personal_id: '',
  date_of_birth: '',
  document_number: '',
  document_expiry_date: '',
  address_street: '',
  address_city: '',
  address_postal_code: '',
  phone: '',
  email: '',
  bank_account: '',
});

// Touched state for field validation feedback
const icoTouched = ref(false);
const nameTouched = ref(false);
const rcTouched = ref(false);
const cityTouched = ref(false);
const pscTouched = ref(false);
const vatIdTouched = ref(false);

// ARES state
const aresLoading = ref(false);
const aresStatus = ref<AresStatusType>('idle');
const aresMessage = ref('');
const aresVerified = ref(false);
const aresVerifiedAt = ref<string | null>(null);

// Track auto-filled fields
const autoFilled = ref({
  name: false,
  vat_id: false,
  address: false,
  bank_account: false,
  company_id: false,
  personal_id: false,
});

// Track if vendor was created from OCR
const isOcrCreated = ref(false);

// Registered bank accounts from ADIS
const registeredBankAccounts = ref<string[]>([]);
const bankAccountSource = ref<'registered' | 'manual'>('manual');

// General state
const loading = ref(false);
const error = ref<string | null>(null);
const vendorId = ref<string | null>(null);

// Validation
const isValidIco = computed(() => {
  const ico = form.value.company_id;
  if (!ico || ico.length !== 8) return false;
  if (!/^\d{8}$/.test(ico)) return false;

  // Czech ICO checksum validation (modulo 11)
  const weights = [8, 7, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 7; i++) {
    sum += parseInt(ico[i], 10) * weights[i];
  }

  const remainder = sum % 11;
  let checkDigit: number;

  if (remainder === 0) {
    checkDigit = 1;
  } else if (remainder === 1) {
    checkDigit = 0;
  } else {
    checkDigit = 11 - remainder;
  }

  return parseInt(ico[7], 10) === checkDigit;
});

// ICO error message
const icoError = computed(() => {
  if (!form.value.company_id) return 'ICO je povinne pole';
  if (!/^\d+$/.test(form.value.company_id)) return 'ICO musi obsahovat pouze cislice';
  if (form.value.company_id.length !== 8) return 'ICO musi mit presne 8 cislic';
  if (!isValidIco.value) return 'Neplatne ICO (kontrolni soucet)';
  return null;
});

const rcError = computed(() => {
  const rc = form.value.personal_id?.replace(/\//g, '');
  if (!rc) return null;
  if (rc.length < 9 || rc.length > 10) return 'Rodne cislo musi mit 9-10 cislic';
  if (!/^\d+$/.test(rc)) return 'Rodne cislo musi obsahovat pouze cislice';

  // Basic validation for RC format (born after 1954 should be divisible by 11)
  if (rc.length === 10) {
    const num = parseInt(rc, 10);
    if (num % 11 !== 0) return 'Neplatne rodne cislo (kontrolni soucet)';
  }

  return null;
});

const isValid = computed(() => {
  if (vendorType.value === 'COMPANY') {
    const vatValid = !form.value.is_vat_payer || (form.value.is_vat_payer && form.value.vat_id);
    return (
      isValidIco.value &&
      form.value.name &&
      form.value.address_city &&
      form.value.address_postal_code &&
      vatValid
    );
  } else {
    return (
      form.value.name &&
      form.value.personal_id &&
      !rcError.value &&
      form.value.address_city &&
      form.value.address_postal_code
    );
  }
});

// Format rodne cislo with slash
function formatRodneCislo(event: Event) {
  const input = event.target as HTMLInputElement;
  let value = input.value.replace(/\D/g, '');

  if (value.length > 6) {
    value = value.slice(0, 6) + '/' + value.slice(6, 10);
  }

  form.value.personal_id = value;
}

// Handle ICO input change
function onIcoInput() {
  // Reset ARES status when ICO changes
  if (aresStatus.value !== 'idle') {
    aresStatus.value = 'idle';
    aresMessage.value = '';
    aresVerified.value = false;
    aresVerifiedAt.value = null;
    autoFilled.value = { name: false, vat_id: false, address: false, bank_account: false, company_id: false, personal_id: false };
    registeredBankAccounts.value = [];
    bankAccountSource.value = 'manual';
  }

  // Trigger debounced lookup if valid
  if (isValidIco.value) {
    debouncedLookup();
  }
}

// Handle bank account source change
function onBankAccountSourceChange(source: 'registered' | 'manual', account?: string) {
  bankAccountSource.value = source;
  if (source === 'registered' && account) {
    form.value.bank_account = account;
    autoFilled.value.bank_account = true;
  } else if (source === 'manual') {
    form.value.bank_account = '';
    autoFilled.value.bank_account = false;
  }
}

// ARES lookup
async function lookupAres() {
  if (!isValidIco.value || aresLoading.value) return;

  aresLoading.value = true;
  aresStatus.value = 'loading';
  aresMessage.value = '';

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/ares-lookup/${form.value.company_id}`,
      {
        headers: {
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();

    if (result.found) {
      // Auto-fill fields from ARES
      form.value.name = result.data.name || '';
      form.value.vat_id = result.data.dic || '';
      form.value.address_street = result.data.address?.street || '';
      form.value.address_city = result.data.address?.city || '';
      form.value.address_postal_code = result.data.address?.postal_code || '';

      // Handle registered bank accounts from ADIS
      if (result.data.registered_bank_accounts && result.data.registered_bank_accounts.length > 0) {
        registeredBankAccounts.value = result.data.registered_bank_accounts;
        // Auto-select first account if no account is currently set
        if (!form.value.bank_account) {
          form.value.bank_account = result.data.registered_bank_accounts[0];
          bankAccountSource.value = 'registered';
          autoFilled.value.bank_account = true;
        }
      } else {
        registeredBankAccounts.value = [];
        bankAccountSource.value = 'manual';
        autoFilled.value.bank_account = false;
      }

      autoFilled.value = {
        ...autoFilled.value,
        name: !!result.data.name,
        vat_id: !!result.data.dic,
        address: !!(result.data.address?.city || result.data.address?.street),
      };

      aresVerified.value = true;
      aresVerifiedAt.value = new Date().toISOString();
      aresStatus.value = 'verified';
      aresMessage.value = `Firma overena: ${result.data.name}`;
    } else {
      aresStatus.value = 'not_found';
      aresMessage.value = result.message || 'Firma nebyla nalezena v ARES';
      aresVerified.value = false;
    }
  } catch (e) {
    console.error('ARES lookup error:', e);
    aresStatus.value = 'error';
    aresMessage.value = 'Chyba pri overovani v ARES';
    aresVerified.value = false;
  } finally {
    aresLoading.value = false;
  }
}

// Debounced ARES lookup
const debouncedLookup = debounce(() => {
  lookupAres();
}, 500);

// Save vendor and continue
async function saveAndContinue() {
  // Mark all fields as touched to show validation
  nameTouched.value = true;
  cityTouched.value = true;
  pscTouched.value = true;
  if (vendorType.value === 'COMPANY') {
    icoTouched.value = true;
    if (form.value.is_vat_payer) {
      vatIdTouched.value = true;
    }
  } else {
    rcTouched.value = true;
  }

  if (!isValid.value) return;

  loading.value = true;
  error.value = null;

  try {
    const vendorData = {
      buying_opportunity_id: props.buyingOpportunityId,
      vendor_type: vendorType.value,
      name: form.value.name.toUpperCase(),
      company_id: vendorType.value === 'COMPANY' ? form.value.company_id : null,
      is_vat_payer: vendorType.value === 'COMPANY' ? form.value.is_vat_payer : false,
      vat_id: vendorType.value === 'COMPANY' && form.value.is_vat_payer ? form.value.vat_id || null : null,
      personal_id: vendorType.value === 'PHYSICAL_PERSON' ? form.value.personal_id : null,
      date_of_birth: vendorType.value === 'PHYSICAL_PERSON' && form.value.date_of_birth
        ? form.value.date_of_birth
        : null,
      document_number: vendorType.value === 'PHYSICAL_PERSON'
        ? form.value.document_number || null
        : null,
      document_expiry_date: vendorType.value === 'PHYSICAL_PERSON' && form.value.document_expiry_date
        ? form.value.document_expiry_date
        : null,
      address_street: form.value.address_street || null,
      address_city: form.value.address_city,
      address_postal_code: form.value.address_postal_code,
      phone: form.value.phone || null,
      email: form.value.email || null,
      bank_account: form.value.bank_account || null,
      ares_verified: vendorType.value === 'COMPANY' ? aresVerified.value : false,
      ares_verified_at: vendorType.value === 'COMPANY' ? aresVerifiedAt.value : null,
      data_source: aresVerified.value ? 'ARES' : 'MANUAL',
    };

    let result;

    if (vendorId.value) {
      // Update existing vendor
      result = await supabase
        .from('vendors')
        .update(vendorData)
        .eq('id', vendorId.value)
        .select()
        .single();
    } else {
      // Create new vendor
      result = await supabase
        .from('vendors')
        .insert(vendorData)
        .select()
        .single();
    }

    if (result.error) throw result.error;

    vendorId.value = result.data.id;
    emit('saved', result.data);
    emit('next');
  } catch (e) {
    error.value = handleError(e, 'VendorForm.saveAndContinue');
  } finally {
    loading.value = false;
  }
}

// Reset form when vendor type changes
watch(vendorType, async () => {
  // Clear type-specific fields
  form.value.company_id = '';
  form.value.is_vat_payer = false;
  form.value.vat_id = '';
  form.value.personal_id = '';
  form.value.date_of_birth = '';
  form.value.document_number = '';
  form.value.document_expiry_date = '';

  // Reset ARES state
  aresStatus.value = 'idle';
  aresMessage.value = '';
  aresVerified.value = false;
  aresVerifiedAt.value = null;
  autoFilled.value = { name: false, vat_id: false, address: false, bank_account: false, company_id: false, personal_id: false };
  registeredBankAccounts.value = [];
  bankAccountSource.value = 'manual';

  // Reset touched state for type-specific fields
  icoTouched.value = false;
  rcTouched.value = false;
  vatIdTouched.value = false;

  // Focus the first input of the new form type
  await nextTick();
  if (vendorType.value === 'COMPANY') {
    icoInputRef.value?.focus();
  } else {
    personNameInputRef.value?.focus();
  }
});

// Load existing vendor data and focus management
onMounted(async () => {
  if (props.existingVendor) {
    vendorId.value = props.existingVendor.id;
    vendorType.value = props.existingVendor.vendor_type;

    form.value = {
      name: props.existingVendor.name || '',
      company_id: props.existingVendor.company_id || '',
      is_vat_payer: props.existingVendor.is_vat_payer || false,
      vat_id: props.existingVendor.vat_id || '',
      personal_id: props.existingVendor.personal_id || '',
      date_of_birth: props.existingVendor.date_of_birth || '',
      document_number: props.existingVendor.document_number || '',
      document_expiry_date: props.existingVendor.document_expiry_date || '',
      address_street: props.existingVendor.address_street || '',
      address_city: props.existingVendor.address_city || '',
      address_postal_code: props.existingVendor.address_postal_code || '',
      phone: props.existingVendor.phone || '',
      email: props.existingVendor.email || '',
      bank_account: props.existingVendor.bank_account || '',
    };

    // Check if vendor was created from OCR
    if (props.existingVendor.data_source === 'OCR') {
      isOcrCreated.value = true;
      // Mark OCR-filled fields
      autoFilled.value = {
        name: !!props.existingVendor.name,
        vat_id: false,
        address: !!(props.existingVendor.address_street || props.existingVendor.address_city),
        bank_account: false,
        company_id: !!props.existingVendor.company_id,
        personal_id: !!props.existingVendor.personal_id,
      };
    }

    // Mark all fields as touched for existing data
    nameTouched.value = true;
    cityTouched.value = true;
    pscTouched.value = true;
    if (props.existingVendor.vendor_type === 'COMPANY') {
      icoTouched.value = true;
    } else {
      // Only mark RC as touched if it has a value (OCR vendors may not have it)
      if (props.existingVendor.personal_id) {
        rcTouched.value = true;
      }
    }

    // Restore ARES verification state
    if (props.existingVendor.ares_verified) {
      aresVerified.value = true;
      aresVerifiedAt.value = props.existingVendor.ares_verified_at;
      aresStatus.value = 'verified';
      aresMessage.value = 'Firma overena v ARES';
    }
  }

  // Auto-focus first input
  await nextTick();
  if (vendorType.value === 'COMPANY') {
    icoInputRef.value?.focus();

    // Auto-trigger ARES lookup if company IČO was pre-filled from OCR
    if (isOcrCreated.value && form.value.company_id && isValidIco.value && !aresVerified.value) {
      // Small delay to ensure UI is ready
      setTimeout(() => {
        lookupAres();
      }, 500);
    }
  } else {
    personNameInputRef.value?.focus();
  }
});
</script>
