# vgthmind — portfolio

Portfolio en ligne de vgthmind (créateur indépendant) : collections, VGTAPE, pièces sur-mesure, petites séries.

Site statique (HTML / CSS / JS vanilla, sans build). Hébergé via Netlify, connecté à ce dépôt pour un déploiement automatique à chaque `git push`.

## Modifier le site

- `index.html` — structure et contenu de toutes les sections
- `css/style.css` — styles
- `js/` — carrousels et lecteur de clips
- `assets/` — photos et vidéos, organisées par chapitre/collection

Après une modification :

```bash
git add -A
git commit -m "décris le changement ici"
git push
```

Netlify redéploie automatiquement le site en ligne dans la minute qui suit.
