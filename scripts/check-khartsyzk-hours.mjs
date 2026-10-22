import { readFile } from 'node:fs/promises'

const contactsHtml = await readFile(new URL('../contacts.html', import.meta.url), 'utf8')
const cityHeading = '<h3 class="contacts-office-city">Харцызск</h3>'
const cityIndex = contactsHtml.indexOf(cityHeading)

if (cityIndex === -1) {
  console.error('Карточка представительства Харцызска не найдена.')
  process.exit(1)
}

const workingHours = contactsHtml.slice(cityIndex, cityIndex + 2500)
const expectedHours = /Пн-Пт: 8:00 - 17:00\s*<br\s*\/?>\s*Сб: 8:00 - 15:00/

if (!expectedHours.test(workingHours)) {
  console.error('В карточке Харцызска нет полного режима работы с отдельной строкой для субботы.')
  process.exit(1)
}

console.log('Режим работы представительства Харцызска указан полностью.')
