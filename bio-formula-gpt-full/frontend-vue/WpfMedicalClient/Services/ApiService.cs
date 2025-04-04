using System.Net.Http;
using System.Threading.Tasks;

namespace WpfMedicalClient.Services
{
    public class ApiService
    {
        private readonly HttpClient _client = new HttpClient();

        public async Task<string> GetPatientDataAsync()
        {
            var response = await _client.GetAsync("https://your-backend-api/patient/data");
            return await response.Content.ReadAsStringAsync();
        }
    }
}
