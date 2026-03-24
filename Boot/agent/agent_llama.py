"""
Agent MARSA MAROC – version Ollama / Mistral 7B
Fait exactement la même chose qu'agent.py mais utilise Mistral 7B (via Ollama)
pour générer les messages d'alerte et interpréter les réponses des chefs.

Prérequis :
  1. Installer Ollama : https://ollama.com/download
  2. Télécharger le modèle :
       ollama pull mistral
  3. pip install ollama
  4. Lancer Ollama (il tourne en arrière-plan après installation)
  5. python agent_llama.py
"""

import os
import time
import logging
from datetime import datetime, timezone

import requests
import ollama
from pymongo import MongoClient
from dotenv import load_dotenv

# ── Configuration ──────────────────────────────────────────────────────────────

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', 'server', '.env'))

SERVER_URL        = os.getenv('SERVER_URL',        'http://localhost:3001')
MONGO_URI         = os.getenv('MONGO_URI',         'mongodb://localhost:27017')
DB_NAME           = os.getenv('DB_NAME',           'marsa_scan')
DELAI_MAX_MIN     = int(os.getenv('DELAI_MAX_MIN', '2'))
POLL_INTERVAL_SEC = int(os.getenv('POLL_INTERVAL_SEC', '60'))
REPLY_TIMEOUT_SEC = int(os.getenv('REPLY_TIMEOUT_SEC', '600'))
OLLAMA_MODEL      = os.getenv('OLLAMA_MODEL',      'mistral')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
log = logging.getLogger('agent_llama')

alertes_envoyees: dict = {}


# ── Fonctions LLM (Ollama / Mistral) ──────────────────────────────────────────

def llm_complete(system: str, user: str) -> str:
    """Appel Ollama chat. Retourne le texte généré ou chaîne vide si erreur."""
    try:
        response = ollama.chat(
            model=OLLAMA_MODEL,
            messages=[
                {'role': 'system', 'content': system},
                {'role': 'user',   'content': user},
            ],
        )
        return response['message']['content'].strip()
    except Exception as exc:
        log.error('Erreur Ollama: %s', exc)
        return ''


def generer_message_alerte(chef_nom: str, team_name: str, heure_arret: str) -> str:
    """
    Demande à Mistral de rédiger le message WhatsApp d'alerte.
    Retombe sur le message statique si Ollama échoue.
    """
    system = (
        "Tu es un assistant de supervision industrielle pour MARSA MAROC. "
        "Rédige uniquement le message WhatsApp demandé, sans explication. "
        "Utilise le format WhatsApp (*gras*) et des emojis appropriés. "
        "Le message doit être en français, professionnel et concis."
    )
    user = (
        f"Rédige un message WhatsApp d'alerte d'arrêt pour :\n"
        f"- Chef d'équipe : {chef_nom}\n"
        f"- Équipe        : {team_name}\n"
        f"- Dernier scan  : {heure_arret}\n"
        f"- Délai sans activité : plus de {DELAI_MAX_MIN} minutes\n"
        f"Termine par une question demandant le motif de cet arrêt."
    )
    generated = llm_complete(system, user)
    if generated:
        return generated

    # Fallback identique à agent.py
    return (
        f"🔴 *MARSA MAROC – Alerte Arrêt*\n"
        f"Bonjour *{chef_nom}*,\n\n"
        f"Équipe : *{team_name}*\n"
        f"Dernier scan détecté à *{heure_arret}*.\n"
        f"Aucune activité depuis plus de *{DELAI_MAX_MIN} min*.\n\n"
        f"Quel est le motif de cet arrêt ?"
    )


def interpreter_reponse(reponse_brute: str) -> str:
    """
    Demande à Mistral d'extraire/reformuler le motif d'arrêt.
    Retombe sur la réponse brute si Ollama échoue.
    """
    system = (
        "Tu es un assistant de supervision industrielle. "
        "Extrait et reformule en une phrase courte et claire le motif d'arrêt "
        "exprimé dans le message du chef d'équipe. "
        "Réponds uniquement avec le motif reformulé, sans phrase d'introduction."
    )
    interpreted = llm_complete(system, f"Message du chef : {reponse_brute}")
    return interpreted if interpreted else reponse_brute


# ── Helpers ────────────────────────────────────────────────────────────────────

def normaliser_numero(numero: str) -> str:
    """Retire les non-chiffres, remplace 0 initial par 212."""
    n = ''.join(c for c in str(numero) if c.isdigit())
    if n.startswith('0'):
        n = '212' + n[1:]
    return n


def send_whatsapp(message: str, numero: str) -> bool:
    try:
        r = requests.post(
            f'{SERVER_URL}/api/whatsapp/send',
            json={'message': message, 'number': numero},
            timeout=15,
        )
        if r.ok:
            log.info('WhatsApp envoyé à %s', numero)
            return True
        log.error('Erreur envoi WhatsApp (%s): %s', r.status_code, r.text)
    except Exception as exc:
        log.error('Exception envoi WhatsApp: %s', exc)
    return False


def poll_reponse(chef_numero: str, since_ms: int) -> str | None:
    """Attend la réponse du chef. Retourne le texte ou None si timeout."""
    chef_id  = normaliser_numero(chef_numero) + '@c.us'
    deadline = time.time() + REPLY_TIMEOUT_SEC
    log.info('Attente réponse de %s (max %ds)…', chef_id, REPLY_TIMEOUT_SEC)

    current_since = since_ms
    while time.time() < deadline:
        time.sleep(10)
        try:
            r = requests.get(
                f'{SERVER_URL}/api/whatsapp/inbox',
                params={'since': current_since},
                timeout=10,
            )
            if r.ok:
                messages = r.json()
                if messages:
                    log.info('Inbox: %d message(s) reçu(s)', len(messages))
                    for msg in messages:
                        log.info('  from=%s | body=%s', msg.get('from'), msg.get('body'))
                        msg_from = msg.get('from', '')
                        if '@g.us' in msg_from or 'status' in msg_from.lower():
                            continue
                        if '@c.us' in msg_from or '@lid' in msg_from:
                            raw_reply = msg['body']
                            log.info('Réponse brute du chef : %s', raw_reply)
                            raison_propre = interpreter_reponse(raw_reply)
                            log.info('Motif interprété par Mistral : %s', raison_propre)
                            return raison_propre
                    latest_ts = max(m.get('timestamp', current_since) for m in messages)
                    current_since = latest_ts + 1
        except Exception as exc:
            log.warning('Erreur poll inbox: %s', exc)

    log.warning('Timeout – pas de réponse du chef')
    return None


def enregistrer_arret(team_name: str, stopped_at: datetime, reason: str, chef_numero: str):
    try:
        r = requests.post(
            f'{SERVER_URL}/api/stops',
            json={
                'team':        team_name,
                'stopped_at':  stopped_at.isoformat(),
                'reason':      reason,
                'chef_number': chef_numero,
            },
            timeout=10,
        )
        if r.ok:
            log.info('Arrêt enregistré → équipe: %s | raison: %s', team_name, reason)
        else:
            log.error('Erreur enregistrement: %s', r.text)
    except Exception as exc:
        log.error('Exception enregistrement: %s', exc)


# ── Logique principale ──────────────────────────────────────────────────────────

def charger_equipes(db) -> list:
    equipes = []
    for doc in db['teams'].find({}):
        phone = doc.get('leader_phone')
        if not phone:
            log.warning(
                'Équipe "%s" – leader_phone manquant, elle sera ignorée.',
                doc.get('name', doc['_id']),
            )
            continue
        equipes.append({
            'name':         doc.get('name', str(doc['_id'])),
            'leader_name':  doc.get('leader_name', ''),
            'leader_phone': str(phone),
            'camera_ids':   [str(c) for c in doc.get('camera_ids', [])],
        })
    return equipes


def dernier_scan_equipe(db, camera_ids: list) -> datetime | None:
    """Retourne la date du dernier scan parmi toutes les caméras de l'équipe."""
    if not camera_ids:
        doc = db['scans'].find_one({}, sort=[('created_at', -1)])
    else:
        from bson import ObjectId
        ids_bson = []
        for cid in camera_ids:
            try:
                ids_bson.append(ObjectId(cid))
            except Exception:
                ids_bson.append(cid)
        doc = db['scans'].find_one(
            {'camera_id': {'$in': ids_bson}},
            sort=[('created_at', -1)],
        )
        if doc is None:
            doc = db['scans'].find_one({}, sort=[('created_at', -1)])

    if doc:
        ts = doc.get('created_at')
        if ts and ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        return ts
    return None


def traiter_arret(equipe: dict, dernier_scan: datetime):
    """Envoie l'alerte au chef (via Mistral) et attend sa réponse."""
    maintenant = time.time()
    team_name  = equipe['name']

    if maintenant - alertes_envoyees.get(team_name, 0) < REPLY_TIMEOUT_SEC:
        return

    alertes_envoyees[team_name] = maintenant
    since_ms    = int(maintenant * 1000)
    heure_arret = dernier_scan.astimezone().strftime('%H:%M')
    chef_nom    = equipe['leader_name']
    chef_phone  = normaliser_numero(equipe['leader_phone'])

    log.info('Génération du message d\'alerte via Mistral…')
    message = generer_message_alerte(chef_nom, team_name, heure_arret)

    log.info('Alerte → %s (%s) | chef: %s (%s)', team_name, heure_arret, chef_nom, chef_phone)

    if not send_whatsapp(message, chef_phone):
        log.error('Envoi WhatsApp échoué – vérifiez que WhatsApp est connecté.')
        return

    raison = poll_reponse(chef_phone, since_ms)
    enregistrer_arret(
        team_name,
        dernier_scan,
        raison if raison else 'Pas de réponse du chef',
        chef_phone,
    )


def verifier_arrets(db):
    maintenant = datetime.now(timezone.utc)
    equipes    = charger_equipes(db)

    if not equipes:
        log.warning('Aucune équipe avec leader_phone trouvée dans la collection teams.')
        return

    for equipe in equipes:
        dernier = dernier_scan_equipe(db, equipe['camera_ids'])

        if dernier is None:
            log.info('Équipe %s – aucun scan en base.', equipe['name'])
            continue

        delai_min = (maintenant - dernier).total_seconds() / 60

        if delai_min > DELAI_MAX_MIN:
            log.warning(
                'ARRÊT – équipe: %s | dernier scan il y a %.1f min | chef: %s',
                equipe['name'], delai_min, equipe['leader_name'],
            )
            traiter_arret(equipe, dernier)
        else:
            log.info(
                'OK – équipe: %-12s | dernier scan il y a %.1f min',
                equipe['name'], delai_min,
            )


# ── Entry point ────────────────────────────────────────────────────────────────

def main():
    log.info('=' * 60)
    log.info('Agent MARSA MAROC (Ollama / Mistral 7B) démarré')
    log.info('Délai max  : %d min | Poll : %ds', DELAI_MAX_MIN, POLL_INTERVAL_SEC)
    log.info('Serveur    : %s', SERVER_URL)
    log.info('Modèle     : %s (Ollama)', OLLAMA_MODEL)
    log.info('=' * 60)

    mongo = MongoClient(MONGO_URI)
    db    = mongo[DB_NAME]
    log.info('Connecté à MongoDB → %s', DB_NAME)

    while True:
        try:
            verifier_arrets(db)
        except Exception as exc:
            log.error('Erreur boucle principale: %s', exc)
        time.sleep(POLL_INTERVAL_SEC)


if __name__ == '__main__':
    main()
