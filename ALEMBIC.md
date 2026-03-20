# Alembic — Guide migrations

## Comment ca marche

Alembic versionne le schema de la base de donnees. Chaque modification (ajout de table, de colonne, etc.) est enregistree dans un fichier de migration Python dans `alembic/versions/`. Ces fichiers contiennent deux fonctions :

- `upgrade()` : applique le changement (ex: `op.add_column(...)`)
- `downgrade()` : annule le changement (ex: `op.drop_column(...)`)

La base contient une table `alembic_version` avec le hash de la derniere migration appliquee. Quand on lance `alembic upgrade head`, Alembic compare ce hash avec les fichiers de migration et execute ceux qui manquent.

---

## Structure du projet

```
internship_helper/
├── alembic.ini              # Config Alembic (l'URL est vide, definie dans env.py)
├── alembic/
│   ├── env.py               # Importe Base.metadata et DATABASE_URL depuis src/
│   ├── script.py.mako       # Template pour les fichiers de migration
│   └── versions/            # Fichiers de migration (un par changement)
│       └── xxxx_initial_schema.py
```

### Configuration

- `alembic.ini` : `sqlalchemy.url` est vide volontairement
- `alembic/env.py` : recupere `DATABASE_URL` depuis `src/config.py` et `Base.metadata` depuis `src/database.py`
- `src/models.py` est importe dans `env.py` pour que tous les modeles soient visibles par l'autogeneration

---

## Utilisation quotidienne

### Modifier un modele et creer une migration

1. Modifier le modele dans `src/models.py`
2. Generer la migration :
   ```bash
   TESTING=1 alembic revision --autogenerate -m "add phone column to users"
   ```
3. **Verifier le fichier genere** dans `alembic/versions/` (l'autogeneration n'est pas parfaite)
4. Appliquer la migration :
   ```bash
   TESTING=1 alembic upgrade head
   ```
5. Commiter le fichier de migration avec le code

> **`TESTING=1`** est necessaire car `src/config.py` leve une erreur si `MISTRAL_API_KEY` n'est pas definie. `TESTING=1` desactive cette verification. Alternativement, si ta cle Mistral est dans ton `.env`, tu peux lancer sans prefixe.

### Commandes utiles

| Commande | Description |
|----------|-------------|
| `alembic upgrade head` | Appliquer toutes les migrations en attente |
| `alembic downgrade -1` | Annuler la derniere migration |
| `alembic current` | Voir la revision actuelle de la base |
| `alembic history` | Voir l'historique des migrations |
| `alembic heads` | Voir la derniere migration disponible |

### Creer une migration manuelle (sans autogenerate)

Utile quand l'autogeneration ne suffit pas (data migration, modification d'enum, etc.) :

```bash
TESTING=1 alembic revision -m "add new value to offerstatus enum"
```

Puis editer le fichier genere manuellement.

---

## Limites de l'autogeneration

L'autogeneration (`--autogenerate`) **ne detecte pas** :

| Cas | Ce qu'Alembic voit | Quoi faire |
|-----|---------------------|------------|
| Renommer une colonne/table | Un `drop` + un `create` | Ecrire manuellement `op.alter_column()` ou `op.rename_table()` |
| Ajouter une valeur a un enum PostgreSQL | Rien | Ecrire manuellement `op.execute("ALTER TYPE offerstatus ADD VALUE 'withdrawn'")` |
| Data migration (modifier des donnees) | Rien | Ecrire une migration manuelle avec des requetes SQL |
| Changements d'index nommes | Depend | Verifier et ajuster si necessaire |

---

## Tests

Les tests ne sont **pas affectes** par Alembic. Ils utilisent `Base.metadata.create_all()` sur SQLite en memoire dans les fixtures (`tests/conftest.py`), ce qui est completement independant des migrations.

---

## Pour un nouveau developpeur (apres clone)

Pas besoin de refaire `alembic init` ni de generer les migrations — tout est deja dans le repo. Il suffit de :

```bash
uv sync                           # installer les dependances
createdb career_db                # creer la base PostgreSQL si elle n'existe pas
uv run alembic upgrade head       # creer toutes les tables via les migrations
```

C'est tout. `upgrade head` applique tous les fichiers de migration dans `alembic/versions/` pour construire le schema complet.

---

## Mise en place initiale (deja faite)

Pour reference, voici ce qui a ete fait pour installer Alembic :

1. Ajoute `alembic>=1.13.0` dans `pyproject.toml`
2. Lance `alembic init alembic`
3. Vide `sqlalchemy.url` dans `alembic.ini`
4. Configure `alembic/env.py` pour importer `Base.metadata` et `DATABASE_URL`
5. Genere la migration initiale via une base temporaire vide (car `career_db` avait deja les tables)
6. `alembic stamp head` sur `career_db` pour marquer la base comme a jour
7. Supprime `Base.metadata.create_all(bind=engine)` de `src/main.py`
