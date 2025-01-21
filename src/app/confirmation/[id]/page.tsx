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
  const initialRender = useRef(true);

  // Gestion optimisée du recalcul de hauteur
  const triggerHeightUpdate = () => {
    requestAnimationFrame(() => {
      calculateHeight();
      setTimeout(calculateHeight, 150);
    });
  };

  useEffect(() => {
    const timer = setTimeout(triggerHeightUpdate, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = () => requestAnimationFrame(calculateHeight);
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [calculateHeight]);

  useEffect(() => {
    if (!initialRender.current) triggerHeightUpdate();
  }, [appointment, pastAppointments, showAllAppointments, loading, error]);

  useEffect(() => {
    if (!loading && appointment) triggerHeightUpdate();
  }, [loading, appointment]);

  const fetchAppointmentHistory = async (clientEmail: string, businessId: string) => {
    try {
      const q = query(
        collection(db, 'appointments'),
        where('clientEmail', '==', clientEmail),
        where('businessId', '==', businessId),
        where('status', 'in', ['confirmed', 'cancelled'])
      );
      
      const snapshot = await getDocs(q);
      return await Promise.all(snapshot.docs.map(async doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          start: data.start.toDate(),
          end: data.end.toDate(),
          createdAt: data.createdAt.toDate(),
          service: await getServiceDetails(data.serviceId),
          staff: await getStaffDetails(data.staffId)
        };
      }));
    } catch (error) {
      console.error('Erreur historique:', error);
      return [];
    }
  };

  const getServiceDetails = async (id: string) => {
    const doc = await getDoc(doc(db, 'services', id));
    return doc.exists() ? doc.data() : { title: 'Service inconnu', price: 0 };
  };

  const getStaffDetails = async (id: string) => {
    const doc = await getDoc(doc(db, 'staff', id));
    return doc.exists() ? doc.data() : { firstName: '', lastName: '' };
  };

  const handleCancelAppointment = async () => {
    if (!appointment || !isFuture(appointment.start)) return;

    try {
      setCancelLoading(true);
      await updateDoc(doc(db, 'appointments', appointment.id), { status: 'cancelled' });
      setAppointment(prev => prev ? { ...prev, status: 'cancelled' } : null);
    } catch (error) {
      setError('Échec de l\'annulation');
    } finally {
      setCancelLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const docSnap = await getDoc(doc(db, 'appointments', params.id as string));
        
        if (!docSnap.exists()) {
          setError('Rendez-vous introuvable');
          return;
        }

        const data = docSnap.data();
        setBusinessId(data.businessId);

        const [service, staff] = await Promise.all([
          getServiceDetails(data.serviceId),
          getStaffDetails(data.staffId)
        ]);

        setAppointment({
          id: docSnap.id,
          start: data.start.toDate(),
          end: data.end.toDate(),
          createdAt: data.createdAt.toDate(),
          clientEmail: data.clientEmail,
          clientName: data.clientName,
          clientPhone: data.clientPhone,
          status: data.status,
          service,
          staff
        });

        if (data.clientEmail && data.businessId) {
          setPastAppointments(await fetchAppointmentHistory(data.clientEmail, data.businessId));
        }
      } catch (error) {
        setError('Erreur de chargement');
      } finally {
        setLoading(false);
        triggerHeightUpdate();
      }
    };

    loadData();
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
