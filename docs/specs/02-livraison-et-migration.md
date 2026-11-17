# LiveShop — paiement et livraison : cadrage MVP

## Statut

Document de travail. Le nouveau parcours n'est pas encore implémenté ni prêt pour la production. Le SQL de migration reste à écrire et à tester.

## Décisions validées

- La cliente paie le solde directement sur le compte Wave de la vendeuse à l'arrivée du livreur. Le livreur ne reçoit pas l'argent et n'a pas de compte LiveShop dans le MVP.
- La vendeuse vérifie elle-même la réception dans son Wave, enregistre sa confirmation dans LiveShop et prévient le livreur qu'il peut remettre le colis. Aucun contrôle Wave ni envoi WhatsApp automatique n'est supposé.
- Après réception du colis, la cliente confirme la remise avec un lien privé, sans créer de compte. Le paiement et la remise sont deux faits séparés.
- Si elle ne peut pas utiliser le lien, la vendeuse l'appelle au numéro de la commande. Si la cliente confirme la remise, la vendeuse l'enregistre. L'application précise : « Livraison confirmée manuellement par la vendeuse, après appel », avec date et heure.
- Si la cliente est injoignable ou conteste la remise, celle-ci reste en attente de vérification. Une déclaration manuelle ne doit pas être présentée comme un clic de la cliente.

## Sécurité et limites

Le lien atteste seulement qu'une personne en possession du lien a confirmé ; il peut être partagé ou envoyé au mauvais numéro. La confirmation Wave est une déclaration manuelle de la vendeuse, pas une preuve automatique fournie par Wave. Les clés privilégiées ne doivent jamais être exposées au navigateur.

Le lien doit utiliser un jeton aléatoire suffisamment long, lié à une seule commande, protégé en stockage et dans les journaux, avec expiration, révocation et utilisation unique. L'ouverture ou l'aperçu du lien ne doit rien modifier : seule une action explicite validée par le serveur peut confirmer la remise. La durée et le renouvellement restent à préciser.

## État du schéma actuel

Les droits directs d'`anon` et `authenticated` sur `place_order`, `confirm_delivery` et les trois vues ont été retirés dans la base et leur absence a été vérifiée. Il faut également auditer les autres objets et les droits des rôles serveur.

L'ancienne fonction `confirm_delivery` ne correspond pas au nouveau parcours : elle utilise un OTP et attribue une déclaration de solde au livreur. Son compteur d'échecs OTP est défectueux : l'exception annule l'incrément. Ne pas l'activer pour des commandes réelles. La règle envisagée de cinq essais ne s'applique pas au lien privé retenu.

Les champs OTP et espèces-livreur restent dans la base actuelle. Ne rien supprimer sans analyse des dépendances et migration versionnée. La base a été initialisée manuellement : ne pas utiliser `supabase db push` avant d'avoir vérifié et aligné l'historique des migrations.

## Plan et tests avant mise en service

1. Définir les états et les autorisations pour une confirmation de paiement par la vendeuse propriétaire et une confirmation de remise distincte.
2. Préparer une migration incrémentale non destructive, avec RLS et droits explicites. La relire et la tester d'abord sur une base isolée.
3. Vérifier qu'une vendeuse ne peut agir que sur ses commandes et qu'aucun client ne peut appeler les fonctions privilégiées directement.
4. Vérifier qu'un aperçu du lien ne confirme rien ; tester les liens invalides, expirés, révoqués ou déjà utilisés.
5. Tester les confirmations répétées et concurrentes, y compris un clic cliente simultané à une confirmation manuelle : pas de doublon, acteur et méthode correctement enregistrés.
6. Tester une commande dont le solde est déjà entièrement payé, sans inventer de paiement supplémentaire. Définir le traitement des paiements partiels avant de l'implémenter.
7. Tester le mode de secours par appel et le cas où la cliente reste injoignable. Aucun parcours n'est prêt tant que ces tests et la revue de sécurité ne sont pas faits.