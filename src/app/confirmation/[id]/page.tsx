'use client';


import { useEffect, useState, useRef } from 'react';
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

  // Ajout d'une référence pour suivre le premier rendu
  const initialRender = useRef(true);

  // Modification de l'effet initial
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateHeight();
      initialRender.current = false;
    }, 100); // Délai légèrement augmenté

    return () => clearTimeout(timer);
  }, []);

  // Écoute des messages de demande de hauteur
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'requestHeight') {
        requestAnimationFrame(calculateHeight);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [calculateHeight]);

  // Modification de l'effet de surveillance des données
  useEffect(() => {
    if (!initialRender.current) {
      requestAnimationFrame(() => {
        calculateHeight();
      });
    }
  }, [appointment, pastAppointments, showAllAppointments, loading, error, calculateHeight])

  // Nouvel effet pour gérer la fin du chargement
  useEffect(() => {
    if (!loading && appointment) {
      const frame = requestAnimationFrame(() => {
        calculateHeight();
        // Forcer un recalcul après animation
        setTimeout(calculateHeight, 50);
      });
      
      return () => cancelAnimationFrame(frame);
    }
  }, [loading, appointment, calculateHeight]);
  

    const fetchAppointmentHistory = async (clientEmail: string, businessId: string) => {
      try {
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('clientEmail', '==', clientEmail),
          where('businessId', '==', businessId),
          where('status', 'in', ['confirmed', 'cancelled'])
        );
    
        const querySnapshot = await getDocs(appointmentsQuery);
        const appointments = await Promise.all(
          querySnapshot.docs.map(async (appointmentDoc) => {
            const data = appointmentDoc.data();
            let serviceDetails;
            let staffDetails;
    
            try {
              const serviceDoc = await getDoc(doc(db, 'services', data.serviceId));
              serviceDetails = serviceDoc.exists() ? serviceDoc.data() : null;
    
              const staffDoc = await getDoc(doc(db, 'staff', data.staffId));
              staffDetails = staffDoc.exists() ? staffDoc.data() : null;
            } catch (error) {
              console.error('Erreur lors de la récupération des détails:', error);
            }
    
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

          const serviceDoc = await getDoc(doc(db, 'services', data.serviceId));
          const serviceData = serviceDoc.data();

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

          if (data.clientEmail && data.businessId) {
            const history = await fetchAppointmentHistory(data.clientEmail, data.businessId);
            setPastAppointments(history);
          }
        } catch (error) {
          console.error('Erreur:', error);
          setError('Erreur lors du chargement des données');
        } finally {
          setLoading(false);
          // Nouveau calcul après la fin du chargement
          setTimeout(calculateHeight, 100);
        }
      };

      fetchData();
    }, [params.id]);


    if (loading) {
      return (
        <Card className="booking-container">
          <div className="loading-state">Chargement...</div>
        </Card>
      );
    }


    if (error || !appointment) {
      return (
        <Card className="booking-container">
          <div className="error-state">
            <h1 className="text-xl font-semibold text-[hsl(var(--destructive))] mb-2">
              {error || 'Rendez-vous non trouvé'}
            </h1>
            <Link href="/">
              <Button className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
                Retourner à l'accueil
              </Button>
            </Link>
          </div>
        </Card>
      );
    }
    

    const isAppointmentCancellable = 
      appointment.status === 'confirmed' && 
      isFuture(appointment.start);

    return (
      <Card className="booking-container">
        <div className="p-4 space-y-6">
          <div className="text-center">
            {appointment.status === 'cancelled' ? (
              <>
                <div className="mx-auto w-12 h-12 bg-[hsl(var(--destructive))]/10 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6 text-[hsl(var(--destructive))]" />
                </div>
                <h1 className="section-title mb-2">Rendez-vous annulé</h1>
                <p className="section-description mb-4">Ce rendez-vous a été annulé</p>
                <Link href={`/?id=${businessId}`}>
                  <Button className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/90">
                    Prendre un nouveau rendez-vous ?
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <div className="mx-auto w-12 h-12 bg-[hsl(var(--accent))] rounded-full flex items-center justify-center mb-4">
                  <Check className="w-6 h-6 text-[hsl(var(--accent-foreground))]" />
                </div>
                <h1 className="section-title mb-2">Réservation confirmée !</h1>
                <p className="section-description">
                  Votre rendez-vous a été enregistré avec succès
                </p>
              </>
            )}
          </div>

          <div className="booking-summary">
            <h2 className="summary-title mb-4">Détails de votre rendez-vous :</h2>
            <div className="space-y-3">
              <p>
                <span className="text-[hsl(var(--muted-foreground))]">Service :</span>{' '}
                <span className="font-medium">{appointment.service.title}</span>
              </p>
              <p>
                <span className="text-[hsl(var(--muted-foreground))]">Date :</span>{' '}
                <span className="font-medium">
                  {format(appointment.start, 'EEEE d MMMM yyyy', { locale: fr })}
                </span>
              </p>
              <p>
                <span className="text-[hsl(var(--muted-foreground))]">Heure :</span>{' '}
                <span className="font-medium">
                  {format(appointment.start, 'HH:mm')}
                </span>
              </p>
              <p>
                <span className="text-[hsl(var(--muted-foreground))]">Avec :</span>{' '}
                <span className="font-medium">
                  {appointment.staff.firstName} {appointment.staff.lastName}
                </span>
              </p>
              <p>
                <span className="text-[hsl(var(--muted-foreground))]">Prix :</span>{' '}
                <span className="font-medium">{appointment.service.price}€</span>
              </p>
              <p>
                <span className="text-[hsl(var(--muted-foreground))]">Client :</span>{' '}
                <span className="font-medium">{appointment.clientName}</span>
              </p>
              <p>
                <span className="text-[hsl(var(--muted-foreground))]">Email :</span>{' '}
                <span className="font-medium">{appointment.clientEmail}</span>
              </p>
              <p>
                <span className="text-[hsl(var(--muted-foreground))]">Téléphone :</span>{' '}
                <span className="font-medium">{appointment.clientPhone}</span>
              </p>
              <p>
                <span className="text-[hsl(var(--muted-foreground))]">Statut :</span>{' '}
                <span className={`font-medium ${
                  appointment.status === 'cancelled' 
                    ? 'text-[hsl(var(--destructive))]'
                    : 'text-[hsl(var(--accent-foreground))]'
                }`}>
                  {appointment.status === 'cancelled' ? 'Annulé' : 'Confirmé'}
                </span>
              </p>
            </div>
          </div>

          {isAppointmentCancellable && (
            <Button
              variant="outline"
              onClick={handleCancelAppointment}
              disabled={cancelLoading}
              className="w-full text-[hsl(var(--destructive))] border-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10"
            >
              {cancelLoading ? 'Annulation...' : 'Annuler ce rendez-vous'}
            </Button>
          )}
{pastAppointments.length > 0 && (
  <div className="space-y-4">
    <h2 className="summary-title flex items-center gap-2">
      <Calendar className="w-5 h-5" />
      Historique de vos rendez-vous
    </h2>
    <div className="space-y-3">
      {(showAllAppointments ? pastAppointments : pastAppointments.slice(0, 2)).map((apt) => (
        <div
          key={apt.id}
          className="p-4 border rounded-lg flex justify-between items-center hover:bg-[hsl(var(--accent))]"
        >
          <div>
            <p className="service-title">{apt.service.title}</p>
            <p className="service-description">
              {format(apt.start, 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
            </p>
            <p className="service-description">
              Avec {apt.staff.firstName} {apt.staff.lastName}
            </p>
          </div>
          <div>
            <span className={`px-3 py-1 rounded-full text-sm ${
              apt.status === 'cancelled'
                ? 'bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]'
                : 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'
            }`}>
              {apt.status === 'cancelled' ? 'Annulé' : 'Effectué'}
            </span>
          </div>
        </div>
      ))}

      {pastAppointments.length > 2 && (
        <button
          onClick={() => setShowAllAppointments(!showAllAppointments)}
          className="w-full flex items-center justify-center gap-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] border rounded-lg p-3"
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
  <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
    Un email de confirmation a été envoyé à {appointment.clientEmail}
  </p>
)}

<div className="flex justify-center gap-4">
  {appointment.status === 'confirmed' && (
    <Link href={`/?id=${businessId}`}>
      <Button 
        variant="outline" 
        className="bg-[hsl(var(--background))] border-[hsl(var(--border))]"
      >
        Réserver un autre rendez-vous
      </Button>
    </Link>
  )}
  <Button
    onClick={() => window.print()}
    variant="outline"
    className="bg-[hsl(var(--background))] border-[hsl(var(--border))]"
  >
    Imprimer
  </Button>
</div>
</div>
      </Card>
    );
}
