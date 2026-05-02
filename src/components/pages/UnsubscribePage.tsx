import { Button } from '@/components/ui/Button'
import styles from './service-page.module.css'

export function UnsubscribePage() {
  return (
    <section className={styles.page} aria-labelledby="unsubscribe-title">
      <div className={styles.inner}>
        <h1 className={styles.title} id="unsubscribe-title">
          Вы отписаны от рассылки
        </h1>
        <div className={styles.content}>
          <p>Ваш запрос на исключение из рассылки принят. Мы больше не будем отправлять вам автоматические письма.</p>
          <p>
            Если это произошло по ошибке или вы хотите снова получать уведомления, свяжитесь с нами по адресу{' '}
            <a href="mailto:sales@grassigrosso.com">sales@grassigrosso.com</a>.
          </p>
          <p className={styles.actions}>
            <Button type="button" variant="secondary" size="md" onClick={() => window.location.assign('/')}>
              Вернуться на главную
            </Button>
          </p>
        </div>
      </div>
    </section>
  )
}
