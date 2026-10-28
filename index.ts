// Ponto de entrada do app.
import 'expo-router/entry';

import { TurboModuleRegistry } from 'react-native';

import { defineNotificationTask } from './src/notifications/backgroundTask';

// A tarefa de notificações em segundo plano precisa ser definida no carregamento
// (o Android pode abrir só ela, com o app fechado, para o "Mais tarde").
// No Expo Go não faz nada: lá as notificações não existem.
defineNotificationTask();

// Widget da tela inicial: o Android o atualiza com o app fechado.
// O módulo nativo só existe no app instalado (no Expo Go, pula).
if (TurboModuleRegistry.get('AndroidWidget')) {
  require('./src/widget/registerTask');
}
