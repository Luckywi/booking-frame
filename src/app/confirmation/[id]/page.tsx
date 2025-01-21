'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { format, isFuture } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Calendar, Check, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { useIframeResize } from '@/lib/hooks/useIframeResize';



interface AppointmentService {
  title: string;
  price: number;
}

interface AppointmentStaff {
  firstName: string;
  lastName: string;
}

interface Appointment {
  id: string;
  start: Date;
  end: Date;
  createdAt: Date;
  clientEmail: string;
  clientName: string;
  clientPhone: string;
  status: 'confirmed' | 'cancelled';
  service: AppointmentService;
  staff: AppointmentStaff;
}

export default function ConfirmationPage() {
  const params = useParams();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null); 
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const calculateHeight = useIframeResize();




    const fetchAppointmentHistory = async (clientEmail: string, businessId: string) => {
      try {
        // Ajout du filtre businessId dans la requête
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('clientEmail', '==', clientEmail),
          where('businessId', '==', businessId),  // Ajout de cette ligne
          where('status', 'in', ['confirmed', 'cancelled'])
        );
    
        const querySnapshot = await getDocs(appointmentsQuery);
    
        // Ensuite, pour chaque rendez-vous, récupérer les détails
        const appointments = await Promise.all(
          querySnapshot.docs.map(async (appointmentDoc) => {
            const data = appointmentDoc.data();
            let serviceDetails;
            let staffDetails;
    
            try {
              // Récupération des détails du service
              const serviceDoc = await getDoc(doc(db, 'services', data.serviceId));
              serviceDetails = serviceDoc.exists() ? serviceDoc.data() : null;
    
              // Récupération des détails du staff
              const staffDoc = await getDoc(doc(db, 'staff', data.staffId));
              staffDetails = staffDoc.exists() ? staffDoc.data() : null;
            } catch (error) {
              console.error('Erreur lors de la récupération des détails:', error);
            }
    
            // Construction de l'objet rendez-vous
            return {
              id: appointmentDoc.id,
              start: data.start.toDate(),
              end: data.end.toDate(),
              createdAt: data.createdAt.toDate(),
              clientEmail: data.clientEmail,
              clientName: data.clientName,
              clientPhone: data.clientPhone,
              status: data.status,
              service: {
                title: serviceDetails?.title || 'Service inconnu',
                price: serviceDetails?.price || 0
              },
              staff: {
                firstName: staffDetails?.firstName || '',
                lastName: staffDetails?.lastName || ''
              }
            };
          })
        );
    
        // Filtrer et trier les résultats
        return appointments
      .filter(apt => apt.id !== params.id)
      .sort((a, b) => b.start.getTime() - a.start.getTime());

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    return [];
  }
};


    const handleCancelAppointment = async () => {
        if (!appointment || !isFuture(appointment.start)) return;
      
        try {
          setCancelLoading(true);
          await updateDoc(doc(db, 'appointments', appointment.id), {
            status: 'cancelled'
          });
      
          setAppointment(prev => prev ? {...prev, status: 'cancelled'} : null);
        } catch (error) {
          console.error('Erreur lors de l\'annulation:', error);
          setError('Erreur lors de l\'annulation du rendez-vous');
        } finally {
          setCancelLoading(false);
        }
      };


      useEffect(() => {
        calculateHeight();
    }, [
        appointment, 
        pastAppointments, 
        showAllAppointments, 
        loading, 
        error, 
        calculateHeight
    ]);



      useEffect(() => {
        const fetchData = async () => {
            if (!params.id) return;

            try {
                setLoading(true);
                const appointmentDoc = await getDoc(doc(db, 'appointments', params.id as string));
                
                if (!appointmentDoc.exists()) {
                    setError('Rendez-vous non trouvé');
                    return;
                }

                const data = appointmentDoc.data();
                setBusinessId(data.businessId);
      
            // Récupérer les détails du service
            const serviceDoc = await getDoc(doc(db, 'services', data.serviceId));
            const serviceData = serviceDoc.data();
      
            // Récupérer les détails du staff
            const staffDoc = await getDoc(doc(db, 'staff', data.staffId));
            const staffData = staffDoc.data();
      
            const currentAppointment: Appointment = {
              id: appointmentDoc.id,
              start: data.start.toDate(),
              end: data.end.toDate(),
              createdAt: data.createdAt.toDate(),
              clientEmail: data.clientEmail,
              clientName: data.clientName,
              clientPhone: data.clientPhone,
              status: data.status,
              service: {
                title: serviceData?.title || 'Service inconnu',
                price: serviceData?.price || 0
              },
              staff: {
                firstName: staffData?.firstName || '',
                lastName: staffData?.lastName || ''
              }
            };
            
            setAppointment(currentAppointment);

      // Modification ici pour passer le businessId
      if (data.clientEmail && data.businessId) {
        const history = await fetchAppointmentHistory(data.clientEmail, data.businessId);
        setPastAppointments(history);
      }
    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur lors du chargement des données');
  } finally {
      setLoading(false);
  }
};

fetchData();
}, [params.id]);


if (loading) {
  return (
    <div className="booking-container p-4">
      <div className="loading-state">Chargement...</div>
    </div>
  );
}

if (error || !appointment) {
  return (
    <div className="booking-container p-4">
      <Card className="w-full max-w-lg mx-auto p-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-600 mb-2">
            {error || 'Rendez-vous non trouvé'}
          </h1>
          <Link href="/">
            <Button>Retourner à l'accueil</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

const isAppointmentCancellable = 
  appointment.status === 'confirmed' && 
  isFuture(appointment.start);

return (
  <div className="booking-container p-4">
    <Card className="w-full max-w-2xl mx-auto p-8">
      <div className="text-center mb-8">
        {appointment.status === 'cancelled' ? (
          <>
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Rendez-vous annulé
            </h1>
            <p className="text-gray-600 mb-6">
              Ce rendez-vous a été annulé
            </p>
            <Link href={`/?id=${businessId}`}>
              <Button className="bg-black text-white hover:bg-gray-800 px-6">
                Prendre un nouveau rendez-vous ?
              </Button>
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Réservation confirmée !
            </h1>
            <p className="text-gray-600">
              Votre rendez-vous a été enregistré avec succès
            </p>
          </>
        )}
      </div>
      
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
  <h2 className="font-medium text-lg mb-4">Détails de votre rendez-vous :</h2>
  <div className="space-y-3">
    <p>
      <span className="text-gray-500">Service :</span>{' '}
      <span className="font-medium">{appointment.service.title}</span>
    </p>
    <p>
      <span className="text-gray-500">Date :</span>{' '}
      <span className="font-medium">
        {format(appointment.start, 'EEEE d MMMM yyyy', { locale: fr })}
      </span>
    </p>
    <p>
      <span className="text-gray-500">Heure :</span>{' '}
      <span className="font-medium">
        {format(appointment.start, 'HH:mm')}
      </span>
    </p>
    <p>
      <span className="text-gray-500">Avec :</span>{' '}
      <span className="font-medium">
        {appointment.staff.firstName} {appointment.staff.lastName}
      </span>
    </p>
    <p>
      <span className="text-gray-500">Prix :</span>{' '}
      <span className="font-medium">{appointment.service.price}€</span>
    </p>
    <p>
      <span className="text-gray-500">Client :</span>{' '}
      <span className="font-medium">{appointment.clientName}</span>
    </p>
    <p>
      <span className="text-gray-500">Email :</span>{' '}
      <span className="font-medium">{appointment.clientEmail}</span>
    </p>
    <p>
      <span className="text-gray-500">Téléphone :</span>{' '}
      <span className="font-medium">{appointment.clientPhone}</span>
    </p>
    <p>
      <span className="text-gray-500">Statut :</span>{' '}
      <span className={`font-medium ${
        appointment.status === 'cancelled' 
          ? 'text-red-600'
          : 'text-green-600'
      }`}>
        {appointment.status === 'cancelled' ? 'Annulé' : 'Confirmé'}
      </span>
    </p>
  </div>
</div>
      
{isAppointmentCancellable && (
  <div className="flex justify-center mb-8">
    <Button
      variant="outline"
      onClick={handleCancelAppointment}
      disabled={cancelLoading}
      className="px-6 text-red-600 border-red-600 hover:bg-red-50"
    >
      {cancelLoading ? 'Annulation...' : 'Annuler ce rendez-vous'}
    </Button>
  </div>
)}
      
      {pastAppointments.length > 0 && (
  <div className="mb-8">
    <h2 className="font-medium flex items-center gap-2 mb-6">
      <Calendar className="w-5 h-5" />
      Historique de vos rendez-vous
    </h2>
    <div className="space-y-4">
      {(showAllAppointments ? pastAppointments : pastAppointments.slice(0, 2)).map((apt) => (
        <div
          key={apt.id}
          className="p-4 border rounded-lg flex justify-between items-center hover:bg-gray-50"
        >
          <div>
            <p className="font-medium">{apt.service.title}</p>
            <p className="text-sm text-gray-500">
              {format(apt.start, 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
            </p>
            <p className="text-sm text-gray-500">
              Avec {apt.staff.firstName} {apt.staff.lastName}
            </p>
          </div>
          <div>
            <span className={`px-3 py-1 rounded-full text-sm
              ${apt.status === 'cancelled' 
                ? 'bg-red-100 text-red-800' 
                : 'bg-green-100 text-green-800'}`}
            >
              {apt.status === 'cancelled' ? 'Annulé' : 'Effectué'}
            </span>
          </div>
        </div>
      ))}

      {pastAppointments.length > 2 && (
        <button
          onClick={() => setShowAllAppointments(!showAllAppointments)}
          className="w-full py-3 mt-4 flex items-center justify-center gap-2 text-gray-500 hover:bg-gray-50"
        >
          <span>{showAllAppointments ? 'Voir moins' : 'Voir plus'}</span>
          {showAllAppointments ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  </div>
)}
      
      {appointment.status === 'confirmed' && (
        <div className="text-center text-sm text-gray-500 mb-8">
          <p>Un email de confirmation a été envoyé à {appointment.clientEmail}</p>
        </div>
      )}
      
      {appointment.status === 'confirmed' ? (
        <div className="flex justify-center gap-4 mt-8">
          <Link href={`/?id=${businessId}`}>
            <Button variant="outline" className="px-6">
              Réserver un autre rendez-vous
            </Button>
          </Link>
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="px-6"
          >
            Imprimer
          </Button>
        </div>
      ) : (
        <div className="flex justify-center mt-8">
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="px-6"
          >
            Imprimer
          </Button>
        </div>
      )}
    </Card>
  </div>
);
}