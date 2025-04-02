using System.Speech.Recognition;

namespace WpfMedicalClient.Services
{
    public class SpeechService
    {
        private SpeechRecognitionEngine recognizer = new SpeechRecognitionEngine();

        public void StartRecognition()
        {
            recognizer.LoadGrammar(new DictationGrammar());
            recognizer.SpeechRecognized += (s, e) =>
            {
                foreach (var result in e.Result.Alternates)
                    System.Diagnostics.Debug.WriteLine(result.Text);
            };
            recognizer.SetInputToDefaultAudioDevice();
            recognizer.RecognizeAsync(RecognizeMode.Multiple);
        }
    }
}
