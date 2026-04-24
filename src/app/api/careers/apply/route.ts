import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const ROLE_TITLES: Record<string, string> = {
  operations: 'Operations',
  drivers: 'Drivers',
  scheduler: 'Scheduler',
  admin: 'Admin',
  pupilcarer: 'Pupil Carer',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { selectedRoles, formData, roleSpecificData, files } = body

    const referenceCode = `CAR-${Date.now().toString(36).toUpperCase()}`

    const positionIds = selectedRoles.join(',')
    const positionNames = selectedRoles
      .map((id: string) => ROLE_TITLES[id] || id)
      .join(',')

    const application = await prisma.jobApplication.create({
      data: {
        referenceCode,
        positionIds,
        positionNames,

        // Personal Details
        title: formData.title || null,
        firstName: formData.firstName,
        middleNames: formData.middleNames || null,
        surname: formData.surname,
        address: formData.address || null,
        postCode: formData.postCode || null,
        dateOfBirth: formData.dateOfBirth || null,
        niNumber: formData.niNumber || null,
        nationality: formData.nationality || null,
        religion: formData.religion || null,
        email: formData.email,
        mobile: formData.mobile || null,
        landline: formData.landline || null,
        languages: formData.languages || null,

        // Next of Kin
        nokName: formData.nokName || null,
        nokAddress: formData.nokAddress || null,
        nokTelephone: formData.nokTelephone || null,

        // Medical History
        disability: formData.disability || null,
        disabilityDetails: formData.disabilityDetails || null,
        registeredDisabled: formData.registeredDisabled || null,
        medicalConditions: formData.medicalConditions || null,
        currentMedication: formData.currentMedication || null,

        // Education & Training (JSON)
        academicHistory: formData.academicHistory
          ? JSON.stringify(formData.academicHistory)
          : null,
        otherQualifications: formData.otherQualifications || null,

        // Employment History (JSON)
        employmentHistory: formData.employmentHistory
          ? JSON.stringify(formData.employmentHistory)
          : null,

        // Role-specific data (JSON)
        roleSpecificData: roleSpecificData
          ? JSON.stringify(roleSpecificData)
          : null,

        // Rehabilitation of Offenders
        criminalRecord: formData.criminalRecord || null,
        noCriminalRecord: formData.noCriminalRecord || null,
        futureDisclosure: formData.futureDisclosure || null,
        addressHistory: formData.addressHistory
          ? JSON.stringify(formData.addressHistory)
          : null,

        // Leisure
        leisureInterests: formData.leisureInterests || null,

        // References (JSON)
        references: formData.references
          ? JSON.stringify(formData.references)
          : null,

        // Equal Opportunities
        eoEthnicity: formData.eoEthnicity || null,
        eoGender: formData.eoGender || null,
        eoAge: formData.eoAge || null,

        // Declaration
        signatureName: formData.signatureName || null,
        signatureDate: formData.signatureDate || null,
        agreeDeclaration: formData.agreeDeclaration || false,

        // Internal notes
        internalNotes: JSON.stringify([]),

        // Files
        files: {
          create: (files || []).map(
            (f: { name: string; size: number; type: string; dataUrl: string }) => ({
              fileName: f.name,
              fileSize: f.size,
              fileType: f.type,
              fileUrl: f.dataUrl,
            })
          ),
        },
      },
    })

    return NextResponse.json({
      success: true,
      referenceCode: application.referenceCode,
    })
  } catch (error) {
    console.error('Career application error:', error)
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    )
  }
}
