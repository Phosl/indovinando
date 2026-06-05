'use client'

import {useRef} from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import {useT} from '@/lib/i18n/useT'
import styles from './PrintCard.module.scss'

export default function PrintCard({game, questions, bottles}) {
  const printRef = useRef(null)
  const t = useT('printSheet')

  const handlePrint = async () => {
    if (!printRef.current) return

    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const imgData = canvas.toDataURL('image/png')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      const imgWidth = pdfWidth
      const imgHeight = (canvas.height * pdfWidth) / canvas.width

      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pdfHeight
      }

      pdf.save(`${game.name || 'sheet'}.pdf`)
    } catch (error) {
      console.error(`${t('pdfError')}:`, error)
      alert(t('pdfError'))
    }
  }

  return (
    <>
      <button onClick={handlePrint} className={styles.printButton}>
        {`📄 ${t('downloadPdf')}`}
      </button>

      <div className={styles.printContainer} ref={printRef}>
        <div className={styles.header}>
          <h1>Indovinando</h1>
          <div className={styles.infoSection}>
            <div className={styles.infoField}>
              <label>{`${t('dateLabel')}:`}</label>
              <div className={styles.underline}></div>
            </div>
            <div className={styles.infoField}>
              <label>{`${t('nameLabel')}:`}</label>
              <div className={styles.underline}></div>
            </div>
          </div>
        </div>

        <div className={styles.bottlesContainer}>
          {bottles.map((bottle, bottleIndex) => (
            <div key={bottleIndex} className={styles.bottleCard}>
              <div className={styles.bottleTable}>
                <div className={styles.bottleColumn}>
                  <div className={styles.bottleIcon}>🍷</div>
                  <div className={styles.bottleInfo}>
                    <div className={styles.bottleLabel}>
                      {bottle.name || `${t('bottleTitle')} ${bottleIndex + 1}`}
                    </div>
                    {bottle.producer && (
                      <div className={styles.bottleProducer}>{bottle.producer}</div>
                    )}
                    {bottle.year && <div className={styles.bottleYear}>{bottle.year}</div>}
                  </div>
                </div>

                <div className={styles.questionsGrid}>
                  {questions.map((question, questionIndex) => (
                    <div key={questionIndex} className={styles.questionColumn}>
                      <div className={styles.questionTitle}>{question.text}</div>
                      <div className={styles.optionsList}>
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className={styles.checkboxRow}>
                            <input
                              type="checkbox"
                              id={`q${bottleIndex}-${questionIndex}-${optionIndex}`}
                              className={styles.checkbox}
                              disabled
                            />
                            <label htmlFor={`q${bottleIndex}-${questionIndex}-${optionIndex}`}>
                              {option}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
