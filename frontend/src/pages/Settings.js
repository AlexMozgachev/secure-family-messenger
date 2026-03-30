import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

export default function Settings() {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ru');
  const [loading, setLoading] = useState(false);

  const handleLanguageChange = async (lang) => {
    setLoading(true);
    setLanguage(lang);
    localStorage.setItem('language', lang);
    toast.success(`Язык изменён на ${lang === 'ru' ? 'русский' : 'english'}`);
    setTimeout(() => {
      window.location.reload();
    }, 500);
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Настройки</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Язык интерфейса</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              variant={language === 'ru' ? 'default' : 'outline'}
              onClick={() => handleLanguageChange('ru')}
              disabled={loading}
            >
              Русский
            </Button>
            <Button 
              variant={language === 'en' ? 'default' : 'outline'}
              onClick={() => handleLanguageChange('en')}
              disabled={loading}
            >
              English
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>О приложении</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Secure Messenger v1.0.0</p>
          <p className="text-gray-500 text-sm mt-2">Защищённый мессенджер с E2E шифрованием</p>
          <p className="text-gray-500 text-sm mt-2">Сервер: mozg.duckdns.org</p>
        </CardContent>
      </Card>
    </div>
  );
}
