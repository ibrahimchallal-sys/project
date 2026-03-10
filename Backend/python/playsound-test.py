from gtts import gTTS
from playsound import playsound
# Input text
text = "j'apas d'internet !"
# Convert text to speech
tts = gTTS(text=text, lang='fr', slow=False)
# Save the audio file
tts.save("output.mp3")
# Play the audio file
playsound("output.mp3")