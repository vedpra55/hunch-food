import os
import django
from unittest import TestCase
from unittest.mock import patch, MagicMock

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hunch.settings')
django.setup()

from django.test import RequestFactory
from accounts.models import Person
from agent.views import voice_transcribe
from agent.voice import transcribe_audio


class VoiceTranscriptionTest(TestCase):
    def setUp(self):
        self.rf = RequestFactory()
        self.person = MagicMock(spec=Person)
        self.person.id = 'test-voice-person'

    def test_missing_audio_returns_400(self):
        req = self.rf.post('/api/voice/transcribe', data='{}', content_type='application/json')
        req.person = self.person
        res = voice_transcribe(req)
        self.assertEqual(res.status_code, 400)

    @patch('agent.voice.get_google_token')
    @patch('agent.voice.httpx.post')
    def test_transcribe_audio_success(self, mock_post, mock_token):
        mock_token.return_value = 'fake-token'
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            'results': [
                {
                    'alternatives': [
                        {'transcript': 'Butter chicken and 2 garlic naan'}
                    ]
                }
            ]
        }
        mock_post.return_value = mock_resp

        audio_bytes = b'fake-audio-data' * 50
        text = transcribe_audio(audio_bytes, 'audio/webm')
        self.assertEqual(text, 'Butter chicken and 2 garlic naan')

    @patch('agent.views.transcribe_audio')
    def test_view_file_upload(self, mock_transcribe):
        mock_transcribe.return_value = 'Momos near Law Gate'
        from django.core.files.uploadedfile import SimpleUploadedFile

        audio_file = SimpleUploadedFile('test.webm', b'audio-bytes', content_type='audio/webm')
        req = self.rf.post('/api/voice/transcribe', {'audio': audio_file})
        req.person = self.person

        res = voice_transcribe(req)
        self.assertEqual(res.status_code, 200)
        import json
        data = json.loads(res.content)
        self.assertEqual(data.get('text'), 'Momos near Law Gate')

