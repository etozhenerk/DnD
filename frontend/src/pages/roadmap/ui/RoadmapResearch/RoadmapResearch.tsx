import type {ResearchProduct} from '../../model/roadmap';
import styles from './RoadmapResearch.module.css';

export function RoadmapResearch({products}: {products: ResearchProduct[]}) {
  const categories = Array.from(new Set(products.map((product) => product.solutionType)));

  return (
    <section className={styles.research} aria-labelledby="research-title">
      <header className={styles.intro}>
        <div>
          <span>Продуктовое исследование</span>
          <h2 id="research-title">Что умеют аналоги и что мы забираем себе</h2>
        </div>
        <p>Мы не выбираем один готовый сервис. Roadmap соединяет лучшие паттерны трёх классов решений под нашу компанию и домашние правила.</p>
      </header>

      <div className={styles.categories} aria-label="Классы исследованных решений">
        {categories.map((category) => (
          <div key={category}>
            <strong>{products.filter((product) => product.solutionType === category).length}</strong>
            <span>{category}</span>
          </div>
        ))}
      </div>

      <div className={styles.grid}>
        {products.map((product) => (
          <article className={styles.card} key={product.name}>
            <header>
              <span>{product.solutionType}</span>
              <a href={product.url} rel="noreferrer" target="_blank">{product.name}<i aria-hidden="true">↗</i></a>
            </header>
            <dl>
              <div>
                <dt>Что умеет</dt>
                <dd>{product.capabilities}</dd>
              </div>
              <div className={styles.adopted}>
                <dt>Что берём</dt>
                <dd>{product.adopted}</dd>
              </div>
              <div className={styles.excluded}>
                <dt>Что не копируем</dt>
                <dd>{product.excluded}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <footer>
        <strong>Вывод</strong>
        <p>Энциклопедии дают модель мира, редакторы веток — сюжетный граф, а VTT-сервисы — активную сцену. Мы соединяем только эти проверенные части и не строим универсальную платформу для всех настольных игр.</p>
      </footer>
    </section>
  );
}
