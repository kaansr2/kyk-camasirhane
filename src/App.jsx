import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Bell, Loader2 } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC3SDdPZV4vSTgWoDuUw4FF239k-_rgk68",
  authDomain: "kyk-camasirhane.firebaseapp.com",
  projectId: "kyk-camasirhane",
  storageBucket: "kyk-camasirhane.firebasestorage.app",
  messagingSenderId: "440802885513",
  appId: "1:440802885513:web:b4aa8065bfc9d5ae1a6b58"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function LaundrySystem() {
  const [activeTab, setActiveTab] = useState('washer');
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    room: '',
    machineType: 'washer',
    machineNumber: '',
    startTime: '',
    endTime: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'laundry'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEntries(data);
      setLoading(false);
    });

    const interval = setInterval(() => {
      checkNotifications();
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      if (permission === 'granted') {
        alert('✅ Bildirimler açıldı! Çamaşırın bitmeden 5 dakika önce haber vereceğiz.');
      }
    } else {
      alert('❌ Bu tarayıcı bildirimleri desteklemiyor.');
    }
  };

  const checkNotifications = () => {
    if (!notificationsEnabled || !('Notification' in window)) return;
    
    const now = new Date();
    entries.forEach(entry => {
      if (entry.notified) return;
      
      const [hours, minutes] = entry.endTime.split(':');
      const endDateTime = new Date();
      endDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
      
      const diffMinutes = (endDateTime - now) / 1000 / 60;
      
      if (diffMinutes <= 5 && diffMinutes > 0) {
        if (Notification.permission === 'granted') {
          new Notification('🧺 Çamaşırın Bitmek Üzere!', {
            body: `${entry.name}, ${entry.machineType === 'washer' ? 'Çamaşır' : 'Kurutma'} Makinesi ${entry.machineNumber}'den çamaşırını 5 dakika içinde alabilirsin!`,
            icon: '🧺',
            tag: `laundry-${entry.id}`
          });
        }
      }
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.room || !formData.machineNumber || !formData.startTime || !formData.endTime) {
      alert('❌ Lütfen tüm alanları doldurun!');
      return;
    }

    try {
      await addDoc(collection(db, 'laundry'), {
        ...formData,
        createdAt: new Date().toISOString(),
        notified: false
      });

      setShowForm(false);
      setFormData({
        name: '',
        phone: '',
        room: '',
        machineType: activeTab,
        machineNumber: '',
        startTime: '',
        endTime: ''
      });

      alert('✅ Kaydın oluşturuldu! Çamaşırın bitmeden 5 dakika önce bildirim alacaksın.');
    } catch (error) {
      alert('❌ Kayıt eklenirken hata oluştu!');
      console.error(error);
    }
  };

  const deleteEntry = async (id) => {
    if (confirm('Bu kaydı silmek istediğinden emin misin?')) {
      try {
        await deleteDoc(doc(db, 'laundry', id));
      } catch (error) {
        alert('❌ Silme işlemi başarısız!');
        console.error(error);
      }
    }
  };

  const formatPhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');
    }
    return phone;
  };

  const isActive = (entry) => {
    const now = new Date();
    const [hours, minutes] = entry.endTime.split(':');
    const endDateTime = new Date();
    endDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
    return endDateTime > now;
  };

  const filteredEntries = entries.filter(e => e.machineType === activeTab);
  const activeEntries = filteredEntries.filter(isActive);
  const completedEntries = filteredEntries.filter(e => !isActive(e));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto mt-10">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Çamaşır Ekle</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">İsim Soyisim</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Ahmet Yılmaz"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Cep Telefonu</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="05XX XXX XX XX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Oda Numarası</label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({...formData, room: e.target.value})}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="203"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Makine Tipi</label>
                <select
                  value={formData.machineType}
                  onChange={(e) => setFormData({...formData, machineType: e.target.value})}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="washer">Çamaşır Makinesi</option>
                  <option value="dryer">Kurutma Makinesi</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Makine Numarası</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.machineNumber}
                  onChange={(e) => setFormData({...formData, machineNumber: e.target.value})}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="1-30 arası"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Başlangıç Saati</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Bitiş Saati (Çamaşırı Alacağınız Saat)</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              {!notificationsEnabled && (
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className="w-full bg-yellow-500 text-white py-3 rounded-lg font-semibold hover:bg-yellow-600 transition flex items-center justify-center gap-2"
                >
                  <Bell className="w-5 h-5" />
                  Bildirimleri Aç (5 dk önce hatırlat)
                </button>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <h1 className="text-2xl font-bold">🧺 İbrahim Hakkı KYK Yurdu</h1>
            <p className="text-blue-100">Çamaşırhane Takip Sistemi</p>
          </div>

          <div className="p-6">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab('washer')}
                className={`flex-1 py-3 rounded-lg font-semibold transition ${
                  activeTab === 'washer'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🧺 Çamaşır Makineleri ({entries.filter(e => e.machineType === 'washer' && isActive(e)).length})
              </button>
              <button
                onClick={() => setActiveTab('dryer')}
                className={`flex-1 py-3 rounded-lg font-semibold transition ${
                  activeTab === 'dryer'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🌀 Kurutma Makineleri ({entries.filter(e => e.machineType === 'dryer' && isActive(e)).length})
              </button>
            </div>

            <button
              onClick={() => {
                setFormData({...formData, machineType: activeTab});
                setShowForm(true);
              }}
              className="w-full bg-green-500 text-white py-4 rounded-xl font-semibold hover:bg-green-600 transition flex items-center justify-center gap-2 mb-6"
            >
              <Plus className="w-5 h-5" />
              Çamaşır Ekle
            </button>

            <div className="space-y-6">
              {activeEntries.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-3 text-gray-800">🟢 Aktif Makineler</h3>
                  <div className="space-y-3">
                    {activeEntries.map(entry => (
                      <div key={entry.id} className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-bold text-lg text-gray-800">
                              {entry.machineType === 'washer' ? '🧺' : '🌀'} Makine {entry.machineNumber}
                            </div>
                            <div className="text-green-700 font-semibold">{entry.name}</div>
                          </div>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>📱 {formatPhone(entry.phone)}</div>
                          <div>🚪 Oda: {entry.room}</div>
                          <div>⏰ Başlangıç: {entry.startTime}</div>
                          <div className="font-semibold text-green-700">
                            ✅ Bitiş: {entry.endTime}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {completedEntries.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-3 text-gray-800">📋 Tamamlanan Kayıtlar</h3>
                  <div className="space-y-3">
                    {completedEntries.slice(0, 10).map(entry => (
                      <div key={entry.id} className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-bold text-gray-800">
                              {entry.machineType === 'washer' ? '🧺' : '🌀'} Makine {entry.machineNumber}
                            </div>
                            <div className="text-gray-700">{entry.name}</div>
                          </div>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>📱 {formatPhone(entry.phone)}</div>
                          <div>🚪 Oda: {entry.room}</div>
                          <div>⏰ {entry.startTime} - {entry.endTime}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeEntries.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">✨</div>
                  <div className="text-lg font-semibold">Tüm makineler boş!</div>
                  <div className="text-sm">Hemen çamaşırını atabilirsin.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
