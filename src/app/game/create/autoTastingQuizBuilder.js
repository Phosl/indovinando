import {
  MIN_AUTO_QUIZ_OPTIONS,
  TEMPLATE_QUESTION_OPTIONS,
  createPriceOptionsFromPrices,
  getLocalizedNotableOptions,
  inferRegion,
  inferVintageQuizValue,
  localizeCountryLabel,
  localizeRegionLabel,
  normalizeToken,
  normalizeAcidityForQuiz,
  normalizeBodyForQuiz,
  normalizeHarmonyForQuiz,
  normalizeNotableForQuiz,
  normalizePriceAnswer,
  resolveRepresentativePrice,
} from './autoTastingHelpers'

function findQuestionOptionIndex(question, value, lang) {
  if (!value || !Array.isArray(question?.options)) return -1

  const rawMatchIndex = question.options.findIndex((option) => option === value)
  if (rawMatchIndex >= 0) return rawMatchIndex

  const normalizedValue = normalizeToken(value)
  if (!normalizedValue) return -1

  if (question._key === 'country') {
    const localizedValue = normalizeToken(localizeCountryLabel(value, lang))
    return question.options.findIndex((option) => {
      const normalizedOption = normalizeToken(option)
      const localizedOption = normalizeToken(localizeCountryLabel(option, lang))
      return normalizedOption === normalizedValue || localizedOption === localizedValue
    })
  }

  if (question._key === 'region') {
    const localizedValue = normalizeToken(localizeRegionLabel(value, lang))
    return question.options.findIndex((option) => {
      const normalizedOption = normalizeToken(option)
      const localizedOption = normalizeToken(localizeRegionLabel(option, lang))
      return normalizedOption === normalizedValue || localizedOption === localizedValue
    })
  }

  return question.options.findIndex((option) => normalizeToken(option) === normalizedValue)
}

export function buildAutoQuizPayload({images, lang = 'it', localizedTemplateOptions, mode = 'standard', t}) {
  const notableOptions = getLocalizedNotableOptions(lang)

  const recognized = (images || []).filter(
    (image) => image?.status === 'recognized' && image?.recognized_name && image?.recognized_producer,
  )
  if (recognized.length === 0) {
    throw new Error('no recognized bottles')
  }

  const bottles = recognized.map((image) => {
    const details = image.recognized_payload?.catalog_details || {}
    const inferredRegion = inferRegion(details, image)
    const grapes = Array.isArray(details.grapes) ? details.grapes.filter(Boolean) : []
    const mainGrape = grapes[0] || null
    const vintageValue = inferVintageQuizValue(image.recognized_vintage, details.known_vintages, lang)
    const whyNotableValue = normalizeNotableForQuiz(
      String(details.why_notable || details.short_description || '').trim().replace(/\s+/g, ' '),
      notableOptions,
    )
    const averagePrice = resolveRepresentativePrice(
      details.average_price ?? details.price ?? null,
      details.price_min ?? null,
      details.price_max ?? null,
    )
    const priceValue = normalizePriceAnswer(averagePrice)
    return {
      name: image.recognized_name,
      producer: image.recognized_producer,
      year: vintageValue || '',
      wineType: details.type || '',
      wineVintageId:
        image.recognized_payload?.catalog_sync?.vintage_id ||
        image.recognized_payload?.web_enrichment?.wine_vintage_id ||
        null,
      priceValue: averagePrice,
      priceMin: details.price_min ?? null,
      priceMax: details.price_max ?? null,
      priceCurrency: details.currency || null,
      priceBand: details.quiz_price_band || details.price_band || null,
      regionLabel: details.quiz_region || inferredRegion || details.region || null,
      appellationLabel: details.quiz_appellation || details.appellation || null,
      _values: {
        country: localizeCountryLabel(details.country, lang),
        region: localizeRegionLabel(inferredRegion || details.region, lang),
        grape: mainGrape,
        vintage: vintageValue,
        notable: whyNotableValue,
        price: priceValue,
        rawPrice: averagePrice,
        body: normalizeBodyForQuiz(details.body, lang),
        acidity: normalizeAcidityForQuiz(details.acidity, lang),
        harmony: normalizeHarmonyForQuiz(details.harmony || details.harmonize, lang),
      },
    }
  })

  const quizPriceOptions = createPriceOptionsFromPrices(bottles.map((bottle) => bottle._values.rawPrice))

  const standardQuestionDefs = [
    {key: 'country', text: t('automaticQuestionCountry'), forceInclude: true},
    {key: 'region', text: t('automaticQuestionRegion')},
    {key: 'grape', text: t('automaticQuestionGrape')},
    {key: 'vintage', text: t('automaticQuestionVintage')},
    {key: 'price', text: t('automaticQuestionPrice')},
  ]
  const openAiQuestionDefs = [
    {key: 'country', text: t('automaticQuestionCountry'), forceInclude: true},
    {key: 'region', text: t('automaticQuestionRegion')},
    {key: 'grape', text: t('automaticQuestionGrape')},
    {key: 'vintage', text: t('automaticQuestionVintage')},
    {key: 'body', text: t('automaticQuestionBody')},
    {key: 'acidity', text: t('automaticQuestionAcidity')},
    {key: 'harmony', text: t('automaticQuestionHarmony')},
    {key: 'notable', text: t('automaticQuestionNotable')},
    {key: 'price', text: t('automaticQuestionPrice')},
    {
      key: 'rating',
      text: t('automaticQuestionRating'),
      kind: 'rating',
      isNeutral: true,
      forceInclude: true,
    },
  ]

  const isSingleBottleQuiz = bottles.length === 1
  const questionDefs = (mode === 'openai' ? openAiQuestionDefs : standardQuestionDefs).filter(
    (question) => {
      if (question.forceInclude) return true
      const values = bottles.map((bottle) => bottle._values[question.key]).filter(Boolean)
      if (values.length !== bottles.length) return false

      const uniqueValuesCount = new Set(values).size
      if (uniqueValuesCount >= 2) return true
      if (isSingleBottleQuiz) return true

      return mode === 'standard' && ['country', 'price'].includes(question.key)
    },
  )

  const templateByKey = {
    country: localizedTemplateOptions.country,
    region: localizedTemplateOptions.region,
    grape: localizedTemplateOptions.grape,
    vintage: localizedTemplateOptions.vintage,
    notable: Object.values(notableOptions),
    price: quizPriceOptions,
    body: localizedTemplateOptions.body,
    acidity: localizedTemplateOptions.acidity,
    harmony: localizedTemplateOptions.harmony,
    rating: TEMPLATE_QUESTION_OPTIONS.rating,
  }
  const effectiveQuestions = questionDefs.map((def) => {
    const extractedValues = [...new Set(bottles.map((b) => b._values[def.key]).filter(Boolean))]
    const templateOptions = templateByKey[def.key] || []
    const options = [...extractedValues, ...templateOptions.filter((option) => !extractedValues.includes(option))].slice(
      0,
      Math.max(MIN_AUTO_QUIZ_OPTIONS, templateOptions.length || 0, extractedValues.length),
    )
    return {
      _key: def.key,
      text: def.text,
      options,
      kind: def.kind || null,
      isNeutral: def.isNeutral === true,
    }
  })

  const readyBottles = bottles.map((bottle) => {
    const answers = effectiveQuestions.map((question) => {
      if (!question._key || question.kind === 'rating' || question.isNeutral === true) return null
      const value = bottle._values[question._key]
      if (!value) return null
      const idx = findQuestionOptionIndex(question, value, lang)
      return idx >= 0 ? idx : null
    })
    return {
      name: bottle.name,
      producer: bottle.producer,
      year: bottle.year,
      wineType: bottle.wineType,
      wineVintageId: bottle.wineVintageId || null,
      priceValue: bottle.priceValue ?? null,
      priceMin: bottle.priceMin ?? null,
      priceMax: bottle.priceMax ?? null,
      priceCurrency: bottle.priceCurrency || null,
      priceBand: bottle.priceBand || null,
      regionLabel: bottle.regionLabel || null,
      appellationLabel: bottle.appellationLabel || null,
      answers,
    }
  })

  return {
    name: `${t('automaticGameNamePrefix')} ${new Date().toLocaleDateString(
      lang === 'en' ? 'en-US' : 'it-IT',
    )}`,
    mode: 'create',
    status: 'draft',
    coverIndex: 0,
    questions: effectiveQuestions.map(({_key, text, options, kind, isNeutral}) => ({
      _key,
      text,
      options,
      kind,
      isNeutral,
    })),
    bottles: readyBottles,
  }
}
